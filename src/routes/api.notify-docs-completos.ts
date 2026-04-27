// Server route llamada desde el área del cliente cuando éste acaba de subir
// un documento. Si con esa subida ha completado todos los obligatorios para
// su perfil, enviamos un email al abogado asignado avisándole. Solo se envía
// una vez por caso (idempotente vía `notificacion_docs_completos_at`).

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface ReqBody {
  leadId: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Lista de categorías obligatorias por perfil — réplica server-side mínima
// para no acoplar el endpoint a los módulos del front. Si cambian las
// reglas en src/lib/documentosRequeridos.ts, actualizar también aquí.
type DocCat =
  | "contrato"
  | "nomina"
  | "vida_laboral"
  | "cese"
  | "dni"
  | "apud_acta";

function detectarPerfil(tipoRelacion: string | null, areaSector: string | null) {
  const t = (tipoRelacion ?? "").toLowerCase();
  const a = (areaSector ?? "").toLowerCase();
  if (t.includes("estatutario")) return "estatutario";
  if (t.includes("funcionario") && (a.includes("sanidad") || a.includes("educacion") || a.includes("educación"))) return "estatutario";
  if (t.includes("funcionario")) return "funcionario";
  if (t.includes("laboral")) return "laboral";
  return "desconocido";
}

function obligatorios(perfil: string, cesado: boolean): DocCat[] {
  // Lista común a todos los perfiles
  const base: DocCat[] = ["contrato", "vida_laboral", "nomina", "dni", "apud_acta"];
  if (cesado) base.push("cese");
  return base;
}

function clienteHaSidoCesado(situacion: string | null): boolean {
  const s = (situacion ?? "").toLowerCase();
  return (
    s.includes("cesado") ||
    s.includes("cesarme") ||
    s.includes("cese") ||
    s.includes("despid") ||
    s.includes("fin de contrato") ||
    s.includes("ya no trabajo")
  );
}

export const Route = createFileRoute("/api/notify-docs-completos")({
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

          const { leadId } = (await request.json()) as ReqBody;
          if (!leadId) return Response.json({ error: "leadId requerido" }, { status: 400 });

          // Carga el lead y comprueba que pertenece al usuario autenticado
          const { data: lead, error: leadErr } = await admin
            .from("leads_interinos")
            .select("id, nombre, email, provincia, tipo_relacion, area_sector, situacion_actual, asignado_a, notificacion_docs_completos_at")
            .eq("id", leadId)
            .maybeSingle();
          if (leadErr || !lead) {
            return Response.json({ error: "Caso no encontrado" }, { status: 404 });
          }
          if ((lead.email ?? "").toLowerCase().trim() !== userEmail) {
            return Response.json({ error: "Sin permiso sobre este caso" }, { status: 403 });
          }

          // Idempotencia: si ya se envió, no reenviamos
          if (lead.notificacion_docs_completos_at) {
            return Response.json({ ok: true, skipped: "already_notified" });
          }

          // Comprueba documentos subidos
          const { data: docs } = await admin
            .from("lead_documentos")
            .select("categoria")
            .eq("lead_id", leadId);
          const cats = new Set((docs ?? []).map((d: any) => d.categoria as DocCat));

          const perfil = detectarPerfil(lead.tipo_relacion, lead.area_sector);
          const cesado = clienteHaSidoCesado(lead.situacion_actual);
          const requeridos = obligatorios(perfil, cesado);
          const faltantes = requeridos.filter((c) => !cats.has(c));
          if (faltantes.length > 0) {
            return Response.json({ ok: true, skipped: "incomplete", faltantes });
          }

          // Resuelve abogado asignado (asignado_a apunta a auth.users.id ó
          // a abogados.user_id según historia: probamos ambos)
          let abogadoEmail: string | null = null;
          let abogadoNombre: string | null = null;
          if (lead.asignado_a) {
            const { data: ab } = await admin
              .from("abogados")
              .select("email, nombre")
              .or(`user_id.eq.${lead.asignado_a},id.eq.${lead.asignado_a}`)
              .maybeSingle();
            if (ab) {
              abogadoEmail = ab.email;
              abogadoNombre = ab.nombre;
            }
          }
          // Fallback: equipo Hispajuris
          const destinatario = abogadoEmail || "empleopublico@hispajuris.es";

          const lovableApiKey = process.env.LOVABLE_API_KEY;
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!lovableApiKey || !resendApiKey) {
            return Response.json({ error: "Email no configurado" }, { status: 503 });
          }

          const fromAddress =
            process.env.MAIL_FROM_ADDRESS ||
            "Plataforma Obadal — Hispajuris <notificaciones@asesor.legal>";
          const subject = `[Asesor.Legal] ${lead.nombre} ha completado toda su documentación`;
          const fichaUrl = `https://interinos.asesor.legal/admin/casos/${leadId}`;
          const messagePlain = `Hola${abogadoNombre ? " " + abogadoNombre : ""},

El cliente ${lead.nombre} (${lead.email}, ${lead.provincia}) acaba de subir el último documento obligatorio de su expediente.

Ya tienes toda la documentación necesaria para revisar el caso y avanzar.

Acceder a la ficha:
${fichaUrl}

— Aviso automático del sistema Asesor.Legal`;
          const messageHtml = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.55">
  <p>Hola${abogadoNombre ? " " + escapeHtml(abogadoNombre) : ""},</p>
  <p>El cliente <strong>${escapeHtml(lead.nombre)}</strong> (${escapeHtml(lead.email)}, ${escapeHtml(lead.provincia ?? "")})
     acaba de subir el último documento obligatorio de su expediente.</p>
  <p>Ya tienes toda la documentación necesaria para revisar el caso y avanzar.</p>
  <p style="margin:24px 0">
    <a href="${fichaUrl}"
       style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
      Abrir ficha del caso →
    </a>
  </p>
  <p style="color:#6b7280;font-size:12px;margin-top:32px">— Aviso automático del sistema Asesor.Legal</p>
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
              to: [destinatario],
              subject,
              html: messageHtml,
              text: messagePlain,
              reply_to: lead.email,
            }),
          });

          if (!resp.ok) {
            const txt = await resp.text().catch(() => "");
            console.error("notify-docs-completos resend error", resp.status, txt);
            return Response.json(
              { error: "No se pudo enviar el email", status: resp.status },
              { status: 502 },
            );
          }

          // Marca el lead como notificado para no repetir
          await admin
            .from("leads_interinos")
            .update({ notificacion_docs_completos_at: new Date().toISOString() })
            .eq("id", leadId);

          // Registra en el historial
          await admin.from("lead_historial").insert({
            lead_id: leadId,
            campo: "notificacion_docs_completos",
            valor_anterior: null,
            valor_nuevo: `Email enviado a ${destinatario}`,
            usuario_id: userData.user.id,
            usuario_email: userEmail,
          });

          return Response.json({ ok: true, sentTo: destinatario });
        } catch (e) {
          console.error("notify-docs-completos error", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
