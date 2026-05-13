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
  /** Versión texto plano (editable, fallback). */
  message: string;
  /** Versión HTML simple para el cuerpo del email. */
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

interface DerivedDocs {
  tieneContrato: string;
  tieneNominas: string;
  tieneVidaLaboral: string;
  docsCompletosTxt: string;
  docsSubidos: LeadDocumento[];
}

function derivarDocs(lead: Lead, docs: LeadDocumento[]): DerivedDocs {
  const presentes = (lead.documentos_disponibles || []).map((d) =>
    d.toLowerCase(),
  );
  const tieneContrato = presentes.some(
    (d) => d.includes("contrato") || d.includes("nombramiento"),
  );
  const tieneNominas = presentes.some(
    (d) => d.includes("nómina") || d.includes("nomina"),
  );
  const tieneVidaLaboral = presentes.some((d) => d.includes("vida laboral"));

  const completos = docsCompletos(lead.documentos_disponibles);
  let docsCompletosTxt: string;
  if (completos) {
    docsCompletosTxt = "Sí";
  } else {
    const faltantes: string[] = [];
    if (!tieneContrato) faltantes.push("Contrato/Nombramiento");
    const tieneAlgunSecundario = presentes.some(
      (d) =>
        d.includes("vida laboral") ||
        d.includes("nómina") ||
        d.includes("nomina") ||
        d.includes("cese") ||
        d.includes("sentencia"),
    );
    if (!tieneAlgunSecundario)
      faltantes.push("Nóminas, Vida laboral, Cese o Sentencia previa");
    docsCompletosTxt =
      faltantes.length > 0 ? `No — falta: ${faltantes.join(", ")}` : "No";
  }

  return {
    tieneContrato: tieneContrato ? "Sí" : "No",
    tieneNominas: tieneNominas ? "Sí" : "No",
    tieneVidaLaboral: tieneVidaLaboral ? "Sí" : "No",
    docsCompletosTxt,
    docsSubidos: docs,
  };
}

/** Construye asunto y cuerpo simple del email al abogado. */
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

  const der = derivarDocs(lead, documentosSubidos);
  const reclamaciones = reclamacionesPorPerfil(lead.perfil);
  const mensajeCliente =
    lead.mensaje_libre && lead.mensaje_libre.trim().length > 0
      ? lead.mensaje_libre.trim()
      : "El cliente no facilitó información adicional.";

  const urgencia = lead.urgencia ? "Sí — caso prioritario" : "No";
  const viabilidad = `${lead.puntuacion_viabilidad}/13`;

  // ===== Texto plano =====
  const L: string[] = [];
  L.push("Buenos días,");
  L.push("");
  L.push("Te adjunto los datos de un caso de interinos:");
  L.push("");
  L.push("1. Resumen del caso");
  L.push(`- Nombre: ${val(lead.nombre)}`);
  L.push(`- Provincia: ${val(lead.provincia)}`);
  L.push(`- Perfil: ${per.label}`);
  L.push(`- Viabilidad: ${viabilidad}`);
  L.push(`- Urgencia: ${urgencia}`);
  L.push(`- Situación actual: ${val(lead.situacion_actual)}`);
  L.push("");
  L.push("2. Datos de contacto");
  L.push(`- Nombre: ${val(lead.nombre)}`);
  L.push(`- Teléfono: ${val(lead.telefono)}`);
  L.push(`- Email: ${val(lead.email)}`);
  L.push(`- Provincia: ${val(lead.provincia)}`);
  L.push("");
  L.push("3. Mensaje del cliente");
  L.push(mensajeCliente);
  L.push("");
  L.push("4. Diagnóstico inicial");
  L.push(`- Semáforo: ${sem.label}`);
  L.push(`- Puntuación: ${viabilidad}`);
  L.push(`- Perfil detectado: ${per.label}`);
  L.push(
    `- Posibles reclamaciones: ${
      reclamaciones.length > 0 ? reclamaciones.join("; ") : NO_FACILITADO
    }`,
  );
  L.push("");
  L.push("5. Documentación indicada");
  L.push(`- Contratos / nombramientos: ${der.tieneContrato}`);
  L.push(`- Nóminas: ${der.tieneNominas}`);
  L.push(`- Vida laboral: ${der.tieneVidaLaboral}`);
  L.push(`- Documentación completa: ${der.docsCompletosTxt}`);
  L.push(
    `- Documentos subidos: ${
      der.docsSubidos.length > 0
        ? der.docsSubidos
            .map((d) => `${d.nombre_original} [${categoriaLabel(d.categoria)}]`)
            .join(", ")
        : "Ninguno"
    }`,
  );
  L.push("");
  L.push("6. Acceso al expediente");
  L.push("Puedes consultar el expediente completo aquí:");
  L.push(fichaUrl);
  L.push("");
  L.push("Atentamente,");
  L.push("Secretariado Hispajuris");
  L.push("empleopublico@hispajuris.es");
  const message = L.join("\n");

  // ===== HTML simple =====
  const p = (s: string) =>
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#111;">${s}</p>`;
  const h = (s: string) =>
    `<p style="margin:18px 0 6px;font-size:14px;line-height:1.4;color:#111;"><strong>${escapeHtml(s)}</strong></p>`;
  const li = (label: string, value: string) =>
    `<li style="margin:0 0 4px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`;
  const ul = (items: string) =>
    `<ul style="margin:0 0 12px 20px;padding:0;font-size:14px;line-height:1.55;color:#111;">${items}</ul>`;

  const reclamItems =
    reclamaciones.length > 0
      ? `<ul style="margin:0 0 12px 20px;padding:0;font-size:14px;line-height:1.55;color:#111;">${reclamaciones
          .map((r) => `<li style="margin:0 0 4px;">${escapeHtml(r)}</li>`)
          .join("")}</ul>`
      : "";

  const docsSubidosTxt =
    der.docsSubidos.length > 0
      ? der.docsSubidos
          .map((d) => `${d.nombre_original} [${categoriaLabel(d.categoria)}]`)
          .join(", ")
      : "Ninguno";

  const mensajeClienteHtml = `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap;">${escapeHtml(mensajeCliente)}</p>`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:640px;margin:0 auto;padding:16px 20px;font-family:Arial,Helvetica,sans-serif;color:#111;">
${p("Buenos días,")}
${p("Te adjunto los datos de un caso de interinos:")}

${h("1. Resumen del caso")}
${ul(
  [
    li("Nombre", val(lead.nombre)),
    li("Provincia", val(lead.provincia)),
    li("Perfil", per.label),
    li("Viabilidad", viabilidad),
    li("Urgencia", urgencia),
    li("Situación actual", val(lead.situacion_actual)),
  ].join(""),
)}

${h("2. Datos de contacto")}
${ul(
  [
    li("Nombre", val(lead.nombre)),
    li("Teléfono", val(lead.telefono)),
    li("Email", val(lead.email)),
    li("Provincia", val(lead.provincia)),
  ].join(""),
)}

${h("3. Mensaje del cliente")}
${mensajeClienteHtml}

${h("4. Diagnóstico inicial")}
${ul(
  [
    li("Semáforo", sem.label),
    li("Puntuación", viabilidad),
    li("Perfil detectado", per.label),
  ].join(""),
)}
${
  reclamaciones.length > 0
    ? `<p style="margin:0 0 4px;font-size:14px;color:#111;"><strong>Posibles reclamaciones:</strong></p>${reclamItems}`
    : `<p style="margin:0 0 12px;font-size:14px;color:#111;"><strong>Posibles reclamaciones:</strong> ${NO_FACILITADO}</p>`
}

${h("5. Documentación indicada")}
${ul(
  [
    li("Contratos / nombramientos", der.tieneContrato),
    li("Nóminas", der.tieneNominas),
    li("Vida laboral", der.tieneVidaLaboral),
    li("Documentación completa", der.docsCompletosTxt),
    li("Documentos subidos", docsSubidosTxt),
  ].join(""),
)}

${h("6. Acceso al expediente")}
${p(`Puedes consultar el expediente completo aquí:<br><a href="${fichaUrl}" style="color:#1a56db;">${escapeHtml(fichaUrl)}</a>`)}

${p("Atentamente,")}
${p('Secretariado Hispajuris<br><a href="mailto:empleopublico@hispajuris.es" style="color:#1a56db;">empleopublico@hispajuris.es</a>')}
</div>
</body></html>`;

  return {
    to: abogado?.email || "",
    cc: "",
    subject,
    message,
    html,
  };
}

// ============== PDF (adjunto opcional) ==============

/** Genera un PDF con la ficha completa del caso. Devuelve base64 (sin prefijo data:). */
export async function generarPdfFichaCaso(
  lead: Lead,
  abogado: { nombre?: string | null; email?: string | null } | null,
  documentosSubidos: LeadDocumento[] = [],
): Promise<{ filename: string; base64: string }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const sem = semaforoConfig(lead.semaforo);
  const per = perfilConfig(lead.perfil);
  const der = derivarDocs(lead, documentosSubidos);
  const reclamaciones = reclamacionesPorPerfil(lead.perfil);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const maxW = pageW - marginX * 2;
  let y = 56;

  const ensure = (need: number) => {
    if (y + need > pageH - 48) {
      doc.addPage();
      y = 56;
    }
  };

  const title = (t: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text(t, marginX, y);
    y += 8;
    doc.setDrawColor(200);
    doc.line(marginX, y, marginX + maxW, y);
    y += 14;
  };

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const lblW = 150;
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value || NO_FACILITADO, maxW - lblW);
    ensure(lines.length * 12 + 4);
    doc.text(lines, marginX + lblW, y);
    y += lines.length * 12 + 4;
  };

  const para = (t: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(t, maxW);
    ensure(lines.length * 13 + 6);
    doc.text(lines, marginX, y);
    y += lines.length * 13 + 8;
  };

  // Cabecera
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("Ficha del caso — Interinos", marginX, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${val(lead.nombre)} · ${val(lead.provincia)} · ${formatDate(lead.created_at)}`,
    marginX,
    y,
  );
  y += 22;

  title("1. Resumen del caso");
  row("Nombre", val(lead.nombre));
  row("Provincia", val(lead.provincia));
  row("Área / tipo", val(lead.tipo_relacion));
  row("Perfil", per.label);
  row("Semáforo", sem.label);
  row("Viabilidad", `${lead.puntuacion_viabilidad}/13`);
  row("Urgencia", lead.urgencia ? "Sí — caso prioritario" : "No");
  row("Estado", val(lead.estado));

  title("2. Datos de contacto");
  row("Nombre", val(lead.nombre));
  row("Email", val(lead.email));
  row("Teléfono", val(lead.telefono));
  row("Provincia", val(lead.provincia));
  row("Fecha de solicitud", formatDate(lead.created_at));

  title("3. Datos personales / perfil");
  const antig =
    lead.anos_servicio !== null && lead.anos_servicio !== undefined
      ? `${lead.anos_servicio} ${lead.anos_servicio === 1 ? "año" : "años"}`
      : NO_FACILITADO;
  row("Tipo de relación", val(lead.tipo_relacion));
  row("Administración", val(lead.administracion));
  row("Antigüedad", antig);
  row("Situación actual", val(lead.situacion_actual));
  row("Nombramientos sucesivos", siNo(lead.contratos_sucesivos));

  title("4. Mensaje del cliente");
  para(
    lead.mensaje_libre && lead.mensaje_libre.trim().length > 0
      ? lead.mensaje_libre.trim()
      : "El cliente no facilitó información adicional.",
  );

  title("5. Diagnóstico automático");
  row("Semáforo", sem.label);
  row("Puntuación de viabilidad", `${lead.puntuacion_viabilidad}/13`);
  row("Perfil detectado", per.label);
  if (reclamaciones.length > 0) {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Posibles reclamaciones:", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    reclamaciones.forEach((r) => {
      const lines = doc.splitTextToSize(`• ${r}`, maxW - 12);
      ensure(lines.length * 12 + 2);
      doc.text(lines, marginX + 12, y);
      y += lines.length * 12 + 2;
    });
    y += 6;
  } else {
    row("Posibles reclamaciones", NO_FACILITADO);
  }

  title("6. Documentación");
  row("Contratos / nombramientos", der.tieneContrato);
  row("Nóminas", der.tieneNominas);
  row("Vida laboral", der.tieneVidaLaboral);
  row("Documentación completa", der.docsCompletosTxt);
  if (der.docsSubidos.length > 0) {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Documentos subidos a la plataforma:", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    der.docsSubidos.forEach((d) => {
      const txt = `• ${d.nombre_original}  [${categoriaLabel(d.categoria)}]`;
      const lines = doc.splitTextToSize(txt, maxW - 12);
      ensure(lines.length * 12 + 2);
      doc.text(lines, marginX + 12, y);
      y += lines.length * 12 + 2;
    });
  } else {
    row("Documentos subidos", "Ninguno");
  }

  title("7. Gestión interna");
  row("Estado del caso", val(lead.estado));
  row("Pago Fase 1", lead.pago_completado ? "Completado" : "Pendiente");
  row(
    "Abogado asignado",
    abogado?.nombre || abogado?.email || "Sin asignar",
  );

  if (lead.notas_abogado && lead.notas_abogado.trim().length > 0) {
    title("8. Notas internas");
    para(lead.notas_abogado.trim());
  }

  // Convertir a base64 sin prefijo
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1] || "";
  const safeName = val(lead.nombre)
    .replace(/[^\w\s\-]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "caso";
  return {
    filename: `Ficha_${safeName}.pdf`,
    base64,
  };
}

// ============== Envío ==============

export interface EnviarEmailLeadResult {
  success: boolean;
  error?: string;
  code?: string;
}

export async function enviarEmailLead(params: {
  leadId: string;
  to: string;
  cc?: string;
  subject: string;
  message: string;
  html?: string;
  attachments?: { filename: string; content: string }[];
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
