import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface SendBody {
  leadId: string;
  to: string;
  cc?: string;
  subject: string;
  message: string;
  html?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(text: string): string {
  // Conserva saltos de línea y respeta escape básico
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.55;white-space:pre-wrap">${escapeHtml(
    text,
  )}</div>`;
}

export const Route = createFileRoute("/api/send-lead-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Auth: el cliente envía el access token del usuario admin
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (!token) {
            return new Response(JSON.stringify({ error: "No autenticado" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const supabaseUrl = process.env.SUPABASE_URL;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!supabaseUrl || !serviceKey) {
            return new Response(
              JSON.stringify({ error: "Backend no configurado" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Verifica token y rol admin
          const supabaseAuth = createClient(supabaseUrl, serviceKey);
          const { data: userData, error: userErr } =
            await supabaseAuth.auth.getUser(token);
          if (userErr || !userData.user) {
            return new Response(JSON.stringify({ error: "Token inválido" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
          const user = userData.user;

          const { data: roles } = await supabaseAuth
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const isAdmin = (roles || []).some((r: any) => r.role === "admin");
          if (!isAdmin) {
            return new Response(
              JSON.stringify({ error: "Solo administradores" }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }

          const body = (await request.json()) as SendBody;
          const { leadId, to, cc, subject, message } = body || ({} as SendBody);

          if (!leadId || !to || !subject || !message) {
            return new Response(
              JSON.stringify({ error: "Faltan campos obligatorios" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          // Validación email destinatario
          const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRe.test(to.trim())) {
            return new Response(
              JSON.stringify({ error: "Email destinatario no válido" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          if (cc && cc.trim() && !emailRe.test(cc.trim())) {
            return new Response(
              JSON.stringify({ error: "Email CC no válido" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          if (subject.length > 250 || message.length > 20000) {
            return new Response(
              JSON.stringify({ error: "Asunto o mensaje demasiado largos" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Comprueba que tenemos las claves para llamar a Resend vía gateway
          const lovableApiKey = process.env.LOVABLE_API_KEY;
          const resendApiKey = process.env.RESEND_API_KEY;

          if (!lovableApiKey || !resendApiKey) {
            return new Response(
              JSON.stringify({
                error:
                  "Resend no está conectado todavía. Ve a Configuración → Email para conectarlo.",
                code: "resend_not_configured",
              }),
              { status: 503, headers: { "Content-Type": "application/json" } },
            );
          }

          // Remitente verificado en el dominio asesor.legal
          const fromAddress =
            process.env.MAIL_FROM_ADDRESS ||
            "Plataforma Obadal — Hispajuris <notificaciones@asesor.legal>";
          const isTestingSender = /onboarding@resend\.dev/i.test(fromAddress);
          const normalizedTo = to.trim();
          const normalizedCc = cc?.trim() || "";

          const fullSubject = subject.startsWith("[Obadal]")
            ? subject
            : `[Obadal] ${subject}`;

          const payload: Record<string, unknown> = {
            from: fromAddress,
            to: [normalizedTo],
            subject: fullSubject,
            html: textToHtml(message),
            text: message,
            reply_to: "empleopublico@hispajuris.es",
          };

          // En modo prueba, el proveedor solo permite un destinatario de test;
          // enviamos sin CC para que el autoenvío de prueba sí funcione.
          if (normalizedCc && !isTestingSender) {
            payload.cc = [normalizedCc];
          }

          const resp = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify(payload),
          });

          const respJson = await resp.json().catch(() => ({}) as any);
          if (!resp.ok) {
            console.error("Resend error", resp.status, respJson);

            const providerMessage =
              typeof respJson?.message === "string" ? respJson.message : "";
            const allowedEmail =
              providerMessage.match(/own email address \(([^)]+)\)/i)?.[1] ||
              null;

            if (allowedEmail) {
              return new Response(
                JSON.stringify({
                  error:
                    normalizedTo.toLowerCase() === allowedEmail.toLowerCase()
                      ? `El envío sigue en modo prueba. Ya puedes enviártelo a ${allowedEmail}, pero solo sin CC ni otros destinatarios.`
                      : `El envío está en modo prueba: solo puedes enviar a ${allowedEmail}. Para enviar a otros correos, primero hay que verificar un dominio de envío.`,
                  code: "resend_test_mode_restriction",
                  allowedEmail,
                }),
                {
                  status: 409,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            return new Response(
              JSON.stringify({
                error:
                  respJson?.message ||
                  `No se pudo enviar el email (HTTP ${resp.status})`,
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Registra en historial
          const detalle = `Email enviado a ${to.trim()}${cc ? ` (cc: ${cc.trim()})` : ""} — Asunto: ${fullSubject}`;
          await supabaseAuth.from("lead_historial").insert({
            lead_id: leadId,
            campo: "email_enviado",
            valor_anterior: null,
            valor_nuevo: detalle,
            usuario_id: user.id,
            usuario_email: user.email ?? null,
          });

          return new Response(
            JSON.stringify({ success: true, id: respJson?.id ?? null }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("send-lead-email failed", err);
          return new Response(
            JSON.stringify({ error: "Error inesperado en el servidor" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
