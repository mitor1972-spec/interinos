// Server route llamada cuando un abogado/admin rechaza un documento del cliente.
// Envía un email al cliente con el motivo del rechazo y le pide que vuelva a
// subirlo. Idempotente vía `notificacion_rechazo_at` en la fila del documento.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface ReqBody {
  documentoId: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const Route = createFileRoute("/api/notify-doc-rechazado")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (!token) {
            return Response.json({ error: "No autenticado" }, { status: 401 });
          }

          const supabaseUrl = process.env.SUPABASE_URL;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!supabaseUrl || !serviceKey) {
            return Response.json({ error: "Backend no configurado" }, { status: 500 });
          }

          const admin = createClient(supabaseUrl, serviceKey);
          const { data: userData, error: userErr } = await admin.auth.getUser(token);
          if (userErr || !userData.user) {
            return Response.json({ error: "Token inválido" }, { status: 401 });
          }
          const userEmail = (userData.user.email ?? "").toLowerCase().trim();

          // Verificamos que el usuario sea admin o lawyer
          const { data: roles } = await admin
            .from("user_roles")
            .select("role")
            .eq("user_id", userData.user.id);
          const isStaff = (roles ?? []).some(
            (r: any) => r.role === "admin" || r.role === "lawyer",
          );
          if (!isStaff) {
            return Response.json({ error: "Solo personal interno" }, { status: 403 });
          }

          const { documentoId } = (await request.json()) as ReqBody;
          if (!documentoId) {
            return Response.json({ error: "documentoId requerido" }, { status: 400 });
          }

          // Carga el documento + lead
          const { data: doc, error: docErr } = await admin
            .from("lead_documentos")
            .select("id, lead_id, nombre_original, categoria, estado, motivo_rechazo, notificacion_rechazo_at")
            .eq("id", documentoId)
            .maybeSingle();
          if (docErr || !doc) {
            return Response.json({ error: "Documento no encontrado" }, { status: 404 });
          }
          if (doc.estado !== "rechazado") {
            return Response.json({ error: "El documento no está rechazado" }, { status: 400 });
          }

          // Idempotencia: si ya se notificó este rechazo (mismo motivo, ya enviado),
          // no reenviamos. Si el abogado actualizó el motivo después, sí reenviamos.
          // Estrategia simple: si notificacion_rechazo_at >= revisado_at, skip.
          const { data: docFull } = await admin
            .from("lead_documentos")
            .select("revisado_at, notificacion_rechazo_at")
            .eq("id", documentoId)
            .maybeSingle();
          if (
            docFull?.notificacion_rechazo_at &&
            docFull?.revisado_at &&
            new Date(docFull.notificacion_rechazo_at) >= new Date(docFull.revisado_at)
          ) {
            return Response.json({ ok: true, skipped: "already_notified" });
          }

          const { data: lead } = await admin
            .from("leads_interinos")
            .select("nombre, email")
            .eq("id", doc.lead_id)
            .maybeSingle();
          if (!lead?.email) {
            return Response.json({ error: "Cliente sin email" }, { status: 400 });
          }

          const lovableApiKey = process.env.LOVABLE_API_KEY;
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!lovableApiKey || !resendApiKey) {
            return Response.json({ error: "Email no configurado" }, { status: 503 });
          }

          const fromAddress =
            process.env.MAIL_FROM_ADDRESS ||
            "Plataforma Obadal — Hispajuris <notificaciones@asesor.legal>";
          const motivo = (doc.motivo_rechazo ?? "").trim() || "Sin motivo especificado";
          const subject = `Documento rechazado: ${doc.nombre_original}`;
          const portalUrl = `https://interinos.asesor.legal/cliente`;
          const textPlain = `Hola ${lead.nombre},

Hemos revisado el documento "${doc.nombre_original}" que subiste a tu expediente y necesitamos que lo vuelvas a subir.

Motivo del rechazo:
${motivo}

Por favor, accede a tu panel y sube de nuevo el documento corregido:
${portalUrl}

Si tienes dudas, responde a este email.

— Equipo Asesor.Legal · Hispajuris`;

          const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.55">
  <p>Hola ${escapeHtml(lead.nombre)},</p>
  <p>Hemos revisado el documento <strong>${escapeHtml(doc.nombre_original)}</strong>
     que subiste a tu expediente y necesitamos que lo <strong>vuelvas a subir</strong>.</p>
  <div style="margin:18px 0;padding:14px 16px;border-left:4px solid #dc2626;background:#fef2f2;border-radius:6px">
    <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.04em">
      Motivo del rechazo
    </div>
    <div style="margin-top:6px;color:#1f2937">${escapeHtml(motivo)}</div>
  </div>
  <p style="margin:24px 0">
    <a href="${portalUrl}"
       style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
      Acceder a mi panel y subir el documento
    </a>
  </p>
  <p style="color:#6b7280;font-size:12px;margin-top:32px">
    — Equipo Asesor.Legal · Hispajuris
  </p>
</div>`.trim();

          const resp = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [lead.email],
              subject,
              html,
              text: textPlain,
            }),
          });

          if (!resp.ok) {
            const txt = await resp.text().catch(() => "");
            console.error("notify-doc-rechazado resend error", resp.status, txt);
            return Response.json(
              { error: "No se pudo enviar el email", status: resp.status },
              { status: 502 },
            );
          }

          await admin
            .from("lead_documentos")
            .update({ notificacion_rechazo_at: new Date().toISOString() })
            .eq("id", documentoId);

          await admin.from("lead_historial").insert({
            lead_id: doc.lead_id,
            campo: "documento_rechazado",
            valor_anterior: doc.nombre_original,
            valor_nuevo: motivo,
            usuario_id: userData.user.id,
            usuario_email: userEmail,
          });

          return Response.json({ ok: true, sentTo: lead.email });
        } catch (e) {
          console.error("notify-doc-rechazado error", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
