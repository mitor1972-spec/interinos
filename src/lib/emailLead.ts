import { supabase } from "@/integrations/supabase/client";
import {
  semaforoConfig,
  perfilConfig,
  reclamacionesPorPerfil,
  docsCompletos,
  formatDate,
  type Lead,
} from "@/lib/leads";
import { categoriaLabel, type LeadDocumento } from "@/lib/documentos";

export interface BorradorEmail {
  to: string;
  cc: string;
  subject: string;
  /** Versión texto plano (editable, fallback para clientes que no aceptan HTML). */
  message: string;
  /** Versión HTML estructurada compatible con Outlook. */
  html: string;
}

const NO_FACILITADO = "No facilitado";

function val(v: string | null | undefined): string {
  if (v === null || v === undefined) return NO_FACILITADO;
  const s = String(v).trim();
  return s.length > 0 ? s : NO_FACILITADO;
}

function siNo(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return NO_FACILITADO;
  return v ? "Sí" : "No";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Construye el asunto y el cuerpo automático del email al abogado. */
export function construirBorradorEmailLead(
  lead: Lead,
  abogado: { nombre?: string | null; email?: string | null } | null,
  documentosSubidos: LeadDocumento[] = [],
  origin?: string,
): BorradorEmail {
  const sem = semaforoConfig(lead.semaforo);
  const per = perfilConfig(lead.perfil);

  const subject = `Interinos - ${val(lead.nombre)} - ${val(lead.provincia)}`;

  const baseOrigin =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  const fichaUrl = `${baseOrigin}/admin/casos?lead=${lead.id}`;

  const completos = docsCompletos(lead.documentos_disponibles);
  let docsCompletosTxt: string;
  if (completos) {
    docsCompletosTxt = "Sí";
  } else {
    const presentes = (lead.documentos_disponibles || []).map((d) =>
      d.toLowerCase(),
    );
    const faltantes: string[] = [];
    const tieneContrato = presentes.some(
      (d) => d.includes("contrato") || d.includes("nombramiento"),
    );
    const tieneAlgunSecundario = presentes.some(
      (d) =>
        d.includes("vida laboral") ||
        d.includes("nómina") ||
        d.includes("nomina") ||
        d.includes("cese") ||
        d.includes("sentencia"),
    );
    if (!tieneContrato) faltantes.push("Contrato/Nombramiento");
    if (!tieneAlgunSecundario)
      faltantes.push("Nóminas, Vida laboral, Cese o Sentencia previa");
    docsCompletosTxt =
      faltantes.length > 0
        ? `No — falta: ${faltantes.join(", ")}`
        : "No";
  }

  const reclamaciones = reclamacionesPorPerfil(lead.perfil);
  const docsMarcados =
    lead.documentos_disponibles && lead.documentos_disponibles.length > 0
      ? lead.documentos_disponibles
      : [];

  const mensajeCliente =
    lead.mensaje_libre && lead.mensaje_libre.trim().length > 0
      ? lead.mensaje_libre.trim()
      : "El cliente no facilitó información adicional";

  const notasAdmin =
    lead.notas_abogado && lead.notas_abogado.trim().length > 0
      ? lead.notas_abogado.trim()
      : "";

  const abogadoAsignado = abogado?.nombre
    ? abogado.nombre
    : abogado?.email || "Sin asignar";

  const motivoUrgencia = lead.urgencia ? "Sí — caso prioritario" : "No";

  // Detección de contratos/nombramientos, nóminas y vida laboral en docs marcados
  const presentes = (lead.documentos_disponibles || []).map((d) => d.toLowerCase());
  const tieneContrato = presentes.some(
    (d) => d.includes("contrato") || d.includes("nombramiento"),
  );
  const tieneNominas = presentes.some(
    (d) => d.includes("nómina") || d.includes("nomina"),
  );
  const tieneVidaLaboral = presentes.some((d) => d.includes("vida laboral"));

  // === Texto plano (editable / fallback) ===
  const lineas: string[] = [];
  lineas.push(`Caso: ${val(lead.nombre)} — ${val(lead.provincia)}`);
  lineas.push(`Perfil: ${per.label} · Semáforo: ${sem.label}`);
  lineas.push("");
  lineas.push(`Mensaje del cliente: ${mensajeCliente}`);
  lineas.push("");
  lineas.push(`Ficha completa: ${fichaUrl}`);
  lineas.push("");
  lineas.push("Atentamente,");
  lineas.push("Secretariado Hispajuris");
  lineas.push("empleopublico@hispajuris.es");
  const message = lineas.join("\n");

  // === HTML estructurado (Outlook-friendly, basado en tablas + CSS inline) ===
  const html = renderHtml({
    lead,
    sem,
    per,
    abogadoAsignado,
    motivoUrgencia,
    mensajeCliente,
    notasAdmin,
    fichaUrl,
    reclamaciones,
    docsMarcados,
    docsCompletosTxt,
    documentosSubidos,
    baseOrigin,
    tieneContrato,
    tieneNominas,
    tieneVidaLaboral,
  });

  return {
    to: abogado?.email || "",
    cc: "",
    subject,
    message,
    html,
  };
}

interface RenderArgs {
  lead: Lead;
  sem: ReturnType<typeof semaforoConfig>;
  per: ReturnType<typeof perfilConfig>;
  abogadoAsignado: string;
  motivoUrgencia: string;
  mensajeCliente: string;
  notasAdmin: string;
  fichaUrl: string;
  reclamaciones: string[];
  docsMarcados: string[];
  docsCompletosTxt: string;
  documentosSubidos: LeadDocumento[];
  baseOrigin: string;
  tieneContrato: boolean;
  tieneNominas: boolean;
  tieneVidaLaboral: boolean;
}

function renderHtml(a: RenderArgs): string {
  const { lead } = a;

  // Estilos inline reutilizables
  const wrapperStyle =
    "background:#f4f6f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;";
  const cardStyle =
    "max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;";
  const headerStyle =
    "background:#0f172a;color:#ffffff;padding:18px 24px;font-size:16px;font-weight:bold;";
  const sectionTitleStyle =
    "font-size:13px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;padding:0 0 6px;border-bottom:2px solid #0f172a;";
  const sectionStyle = "padding:18px 24px;border-top:1px solid #f1f5f9;";
  const labelTd =
    "padding:6px 12px 6px 0;font-size:13px;color:#6b7280;width:42%;vertical-align:top;";
  const valueTd =
    "padding:6px 0;font-size:13px;color:#111827;font-weight:600;vertical-align:top;";
  const blockquoteStyle =
    "margin:0;padding:14px 16px;background:#f8fafc;border-left:4px solid #0f172a;border-radius:6px;font-size:14px;color:#1f2937;line-height:1.55;white-space:pre-wrap;";
  const buttonStyle =
    "display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;";
  const footerStyle =
    "padding:18px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6;";

  const row = (label: string, value: string): string =>
    `<tr><td style="${labelTd}">${escapeHtml(label)}</td><td style="${valueTd}">${escapeHtml(value)}</td></tr>`;

  const tabla = (rows: string): string =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${rows}</table>`;

  const seccion = (titulo: string, contenido: string): string =>
    `<div style="${sectionStyle}"><h3 style="${sectionTitleStyle}">${escapeHtml(titulo)}</h3>${contenido}</div>`;

  // 1. Resumen
  const resumen = tabla(
    [
      row("Nombre del cliente", val(lead.nombre)),
      row("Provincia", val(lead.provincia)),
      row("Área / tipo de caso", val(lead.tipo_relacion)),
      row("Perfil detectado", a.per.label),
      row("Semáforo", `${a.sem.emoji} ${a.sem.label}`),
      row("Puntuación de viabilidad", `${lead.puntuacion_viabilidad}/13`),
      row("Urgencia declarada", a.motivoUrgencia),
      row("Estado del caso", val(lead.estado)),
    ].join(""),
  );

  // 2. Contacto
  const contacto = tabla(
    [
      row("Nombre", val(lead.nombre)),
      row("Email", val(lead.email)),
      row("Teléfono", val(lead.telefono)),
      row("Provincia", val(lead.provincia)),
      row("Fecha de solicitud", formatDate(lead.created_at)),
    ].join(""),
  );

  // 3. Datos personales / perfil
  const antiguedad =
    lead.anos_servicio !== null && lead.anos_servicio !== undefined
      ? `${lead.anos_servicio} ${lead.anos_servicio === 1 ? "año" : "años"}`
      : NO_FACILITADO;
  const personales = tabla(
    [
      row("Tipo de relación", val(lead.tipo_relacion)),
      row("Administración", val(lead.administracion)),
      row("Antigüedad", antiguedad),
      row("Situación actual", val(lead.situacion_actual)),
      row("Nombramientos sucesivos", siNo(lead.contratos_sucesivos)),
      row("Procesos selectivos aprobados", NO_FACILITADO),
      row("Plaza obtenida", NO_FACILITADO),
    ].join(""),
  );

  // 4. Mensaje del cliente
  const mensaje = `<blockquote style="${blockquoteStyle}">${escapeHtml(a.mensajeCliente)}</blockquote>`;

  // 5. Diagnóstico
  const reclamItems =
    a.reclamaciones.length > 0
      ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#111827;line-height:1.7;">${a.reclamaciones
          .map((r) => `<li>${escapeHtml(r)}</li>`)
          .join("")}</ul>`
      : `<div style="font-size:13px;color:#6b7280;">${NO_FACILITADO}</div>`;
  const diagnostico =
    tabla(
      [
        row("Semáforo", `${a.sem.emoji} ${a.sem.label}`),
        row("Puntuación de viabilidad", `${lead.puntuacion_viabilidad}/13`),
        row("Perfil detectado", a.per.label),
      ].join(""),
    ) +
    `<div style="margin-top:12px;"><div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Posibles reclamaciones:</div>${reclamItems}</div>`;

  // 6. Documentación
  const docsSubidosHtml =
    a.documentosSubidos.length > 0
      ? `<ul style="margin:6px 0 0;padding-left:20px;font-size:13px;color:#111827;line-height:1.7;">${a.documentosSubidos
          .map(
            (d) =>
              `<li>${escapeHtml(d.nombre_original)} <span style="color:#6b7280;">[${escapeHtml(categoriaLabel(d.categoria))}]</span></li>`,
          )
          .join("")}</ul>`
      : `<div style="font-size:13px;color:#6b7280;">Ningún documento subido a la plataforma</div>`;

  const documentacion =
    tabla(
      [
        row("Contratos o nombramientos", a.tieneContrato ? "Sí" : "No"),
        row("Nóminas", a.tieneNominas ? "Sí" : "No"),
        row("Certificado de vida laboral", a.tieneVidaLaboral ? "Sí" : "No"),
        row("Documentación completa", a.docsCompletosTxt),
      ].join(""),
    ) +
    `<div style="margin-top:12px;"><div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Documentos subidos a la plataforma:</div>${docsSubidosHtml}</div>`;

  // 7. Gestión interna
  const gestion = tabla(
    [
      row("Estado del caso", val(lead.estado)),
      row("Pago Fase 1", lead.pago_completado ? "Completado" : "Pendiente"),
      row("Abogado asignado", a.abogadoAsignado),
      row("Tipo de reclamación", NO_FACILITADO),
      row("Resultado contacto", NO_FACILITADO),
      row("Siguiente acción", NO_FACILITADO),
      row("Urgencia percibida", NO_FACILITADO),
      row("Encargo firmado", NO_FACILITADO),
      row("Conflicto comprobado", NO_FACILITADO),
      row("Factura emitida", NO_FACILITADO),
      row("Apud Acta recibido", NO_FACILITADO),
    ].join(""),
  );

  // 8. Notas internas
  const notas = a.notasAdmin
    ? `<blockquote style="${blockquoteStyle}">${escapeHtml(a.notasAdmin)}</blockquote>`
    : `<div style="font-size:13px;color:#6b7280;">Sin notas internas.</div>`;

  // 9. Acceso al expediente
  const acceso = `
    <div style="text-align:center;padding:8px 0 4px;">
      <a href="${a.fichaUrl}" style="${buttonStyle}">ABRIR EXPEDIENTE</a>
    </div>
    <div style="margin-top:12px;font-size:12px;color:#6b7280;text-align:center;word-break:break-all;">
      ${escapeHtml(a.fichaUrl)}
    </div>`;

  // 10. Firma
  const firma = `
    <div style="${footerStyle}">
      Atentamente,<br>
      <strong style="color:#0f172a;">Secretariado Hispajuris</strong><br>
      <a href="mailto:empleopublico@hispajuris.es" style="color:#0f172a;text-decoration:none;">empleopublico@hispajuris.es</a>
    </div>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(`Interinos - ${val(lead.nombre)} - ${val(lead.provincia)}`)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <div style="${wrapperStyle}">
    <div style="${cardStyle}">
      <div style="${headerStyle}">Nuevo caso — ${escapeHtml(val(lead.nombre))} (${escapeHtml(val(lead.provincia))})</div>
      ${seccion("1. Breve resumen del caso", resumen)}
      ${seccion("2. Datos del contacto", contacto)}
      ${seccion("3. Datos personales / perfil", personales)}
      ${seccion("4. Mensaje del cliente", mensaje)}
      ${seccion("5. Diagnóstico automático", diagnostico)}
      ${seccion("6. Documentación indicada por el cliente", documentacion)}
      ${seccion("7. Gestión interna", gestion)}
      ${seccion("8. Notas internas", notas)}
      ${seccion("9. Acceso al expediente", acceso)}
      ${firma}
    </div>
  </div>
</body></html>`;
}

export interface EnviarEmailLeadResult {
  success: boolean;
  error?: string;
  code?: string;
}

/** Llama al endpoint /api/send-lead-email con el access token actual. */
export async function enviarEmailLead(params: {
  leadId: string;
  to: string;
  cc?: string;
  subject: string;
  message: string;
  html?: string;
}): Promise<EnviarEmailLeadResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { success: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  try {
    const resp = await fetch("/api/send-lead-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const json = await resp.json().catch(() => ({}) as any);
    if (!resp.ok) {
      return {
        success: false,
        error: json?.error || `Error HTTP ${resp.status}`,
        code: json?.code,
      };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "No se pudo contactar con el servidor",
    };
  }
}
