import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";
import { formatDate } from "@/lib/leads";
import { categoriaLabel, type LeadDocumento } from "@/lib/documentos";
import { fetchHistorial, labelCampo, type HistorialEntry } from "@/lib/historial";
import { labelSiguienteAccion } from "@/lib/gestionHispajuris";
import { reclamacionesPorPerfil } from "@/lib/leads";

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function row(label: string, value: unknown): string {
  return `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
}

function slug(s: string): string {
  return (s || "caso")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function fechaHoy(): string {
  return new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fechaArchivo(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function cargarDocumentos(leadId: string): Promise<LeadDocumento[]> {
  const { data } = await supabase
    .from("lead_documentos")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadDocumento[];
}

function bloque(titulo: string, htmlInterior: string, saltoPagina = false): string {
  return `<section class="bloque${saltoPagina ? " salto-pagina" : ""}">
    <h2>${esc(titulo)}</h2>
    ${htmlInterior}
  </section>`;
}

export async function construirHtmlInforme(lead: Lead): Promise<{
  html: string;
  baseFilename: string;
}> {
  const [documentos, historial] = await Promise.all([
    cargarDocumentos(lead.id),
    fetchHistorial(lead.id),
  ]);

  const expediente = lead.id.slice(0, 8).toUpperCase();
  const baseFilename = `Caso_${slug(lead.nombre)}_${fechaArchivo()}`;

  const reclamaciones = reclamacionesPorPerfil(lead.perfil);

  const datosPersonales = `
    <table class="tabla">
      ${row("Nombre", lead.nombre)}
      ${row("Email", lead.email)}
      ${row("Teléfono", lead.telefono)}
      ${row("Provincia", lead.provincia)}
      ${row("Recibido", formatDate(lead.created_at))}
    </table>`;

  const datosCaso = `
    <table class="tabla">
      ${row("Tipo de relación", lead.tipo_relacion)}
      ${row("Administración", lead.administracion)}
      ${row("Años de servicio", lead.anos_servicio)}
      ${row("Situación actual", lead.situacion_actual)}
      ${row("Contratos sucesivos", lead.contratos_sucesivos ? "Sí" : "No")}
      ${row("Urgencia", lead.urgencia ? "Sí" : "No")}
    </table>
    ${
      lead.mensaje_libre
        ? `<p class="nota"><strong>Mensaje del cliente:</strong><br/>${esc(lead.mensaje_libre).replace(/\n/g, "<br/>")}</p>`
        : ""
    }`;

  const diagnostico = `
    <table class="tabla">
      ${row("Semáforo", lead.semaforo)}
      ${row("Resultado viabilidad", lead.resultado_viabilidad)}
      ${row("Perfil", lead.perfil)}
      ${row("Puntuación", `${lead.puntuacion_viabilidad} / 13`)}
      ${row("Título diagnóstico", lead.diagnostico_titulo)}
    </table>
    ${
      lead.diagnostico_mensaje
        ? `<p class="nota">${esc(lead.diagnostico_mensaje)}</p>`
        : ""
    }
    <h3>Qué podría reclamar</h3>
    <ul>${reclamaciones.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`;

  const gestion = `
    <table class="tabla">
      ${row("Estado", lead.estado)}
      ${row("Tipo de reclamación", lead.tipo_reclamacion)}
      ${row("Motivo específico", lead.motivo_especifico)}
      ${row("Área / Sector", lead.area_sector)}
      ${row("Resultado contacto", lead.resultado_contacto)}
      ${row("Siguiente acción", lead.siguiente_accion ? labelSiguienteAccion(lead.siguiente_accion) : null)}
      ${row("Acción pendiente", lead.accion_pendiente)}
      ${row("Encargo firmado", lead.encargo_firmado ? "Sí" : "No")}
      ${row("Cobro realizado", lead.cobro_realizado ? "Sí" : "No")}
      ${row("Factura emitida", lead.factura_emitida ? "Sí" : "No")}
      ${row("Apud Acta recibido", lead.apud_acta_recibido ? "Sí" : "No")}
      ${row("Pago completado", lead.pago_completado ? "Sí" : "No")}
      ${row("Importe pagado", lead.pago_importe ? `${lead.pago_importe} €` : null)}
      ${row("Método de pago", lead.metodo_pago)}
      ${row("Fecha de pago", lead.pago_fecha ? formatDate(lead.pago_fecha) : null)}
    </table>`;

  const docsHtml = documentos.length
    ? `<table class="tabla lista">
        <thead><tr><th>Documento</th><th>Categoría</th><th>Estado</th><th>Subido</th></tr></thead>
        <tbody>
          ${documentos
            .map(
              (d) => `<tr>
                <td>${esc(d.nombre_original)}</td>
                <td>${esc(categoriaLabel(d.categoria))}</td>
                <td>${esc(d.estado)}</td>
                <td>${esc(formatDate(d.created_at))}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="nota">Sin documentos aportados.</p>`;

  const notas = lead.notas_abogado
    ? `<p class="nota">${esc(lead.notas_abogado).replace(/\n/g, "<br/>")}</p>`
    : `<p class="nota">Sin notas internas.</p>`;

  const historialHtml = historial.length
    ? `<table class="tabla lista">
        <thead><tr><th>Fecha</th><th>Campo</th><th>Anterior</th><th>Nuevo</th><th>Usuario</th></tr></thead>
        <tbody>
          ${historial
            .map(
              (h: HistorialEntry) => `<tr>
                <td>${esc(formatDate(h.created_at))}</td>
                <td>${esc(labelCampo(h.campo))}</td>
                <td>${esc(h.valor_anterior)}</td>
                <td>${esc(h.valor_nuevo)}</td>
                <td>${esc(h.usuario_email)}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="nota">Sin cambios registrados.</p>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Caso ${esc(lead.nombre)} — Expediente ${esc(expediente)}</title>
<style>
  @page {
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
    @bottom-center {
      content: "Documento confidencial — Plataforma Obadal  ·  Página " counter(page) " de " counter(pages);
      font-size: 9pt;
      color: #666;
    }
    @top-center {
      content: "Hispajuris · Asesor.Legal  —  Expediente ${esc(expediente)}";
      font-size: 9pt;
      color: #1a3a5c;
      font-weight: bold;
    }
  }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2937; font-size: 9.5pt; line-height: 1.35; }
  header.cab { border-bottom: 1.5px solid #1a3a5c; padding-bottom: 6px; margin-bottom: 10px; }
  header.cab .marca { font-size: 12pt; font-weight: 700; color: #1a3a5c; letter-spacing: 0.3px; }
  header.cab .meta { display: flex; justify-content: space-between; font-size: 8.5pt; color: #555; margin-top: 2px; }
  h1 { font-size: 14pt; color: #1a3a5c; margin: 2px 0 8px; page-break-after: avoid; font-weight: 700; }
  h2 { font-size: 10.5pt; color: #1a3a5c; border-bottom: 1px solid #cfd8e3; padding-bottom: 2px; margin: 10px 0 4px; page-break-after: avoid; break-after: avoid; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  h3 { font-size: 9.5pt; margin: 6px 0 3px; color: #1a3a5c; page-break-after: avoid; break-after: avoid; font-weight: 600; }
  .bloque { margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }
  .salto-pagina { /* desactivado para informe compacto */ }
  table { page-break-inside: avoid; break-inside: avoid; }
  table.tabla { width: 100%; border-collapse: collapse; margin: 2px 0; }
  table.tabla th, table.tabla td { padding: 3px 6px; border: 1px solid #e2e8f0; vertical-align: top; text-align: left; font-size: 9pt; }
  table.tabla th { background: #f8fafc; width: 32%; font-weight: 600; color: #1a3a5c; }
  table.tabla.lista th { width: auto; }
  table.tabla.lista thead { display: table-header-group; }
  table.tabla.lista tfoot { display: table-footer-group; }
  table.tabla.lista thead th { background: #1a3a5c; color: #fff; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  ul { margin: 4px 0 4px 20px; }
  li { page-break-inside: avoid; break-inside: avoid; }
  .nota { background: #f8fafc; border-left: 2px solid #1a3a5c; padding: 5px 8px; margin: 4px 0; font-size: 9pt; page-break-inside: avoid; break-inside: avoid; }
  @media print {
    .no-print { display: none !important; }
    header.cab { display: none; }
  }
  .toolbar { position: sticky; top: 0; background: #1a3a5c; color: #fff; padding: 10px; text-align: center; margin: -18mm -16mm 18px; z-index: 100; }
  .toolbar button { background: #fff; color: #1a3a5c; border: none; padding: 8px 16px; font-weight: bold; border-radius: 4px; cursor: pointer; margin: 0 4px; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    <button onclick="window.close()">Cerrar</button>
  </div>

  <header class="cab">
    <div class="marca">Hispajuris · Asesor.Legal</div>
    <div class="meta">
      <span>Expediente: <strong>${esc(expediente)}</strong></span>
      <span>Fecha: <strong>${esc(fechaHoy())}</strong></span>
    </div>
  </header>

  <h1>Informe del caso — ${esc(lead.nombre)}</h1>

  ${bloque("1. Datos personales del cliente", datosPersonales)}
  ${bloque("2. Datos del caso", datosCaso)}
  ${bloque("3. Diagnóstico", diagnostico)}
  ${bloque("4. Gestión Hispajuris", gestion)}
  ${bloque("5. Documentación aportada", docsHtml)}
  ${bloque("6. Notas internas del abogado", notas)}
  ${bloque("7. Historial de cambios", historialHtml)}
</body>
</html>`;

  return { html, baseFilename };
}

/** Abre el informe en una nueva ventana lista para imprimir/guardar como PDF.
 *  Usa Blob URL en lugar de document.write() para no corromper el árbol DOM
 *  que React gestiona en la pestaña actual (evita NotFoundError: removeChild). */
export async function descargarInformePDF(lead: Lead): Promise<void> {
  const { html } = await construirHtmlInforme(lead);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Permite ventanas emergentes para descargar el PDF");
  }
  // Liberar el Blob URL una vez la ventana ha tenido tiempo de cargarlo
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }, 5000);
}

/** Descarga el informe como .doc (Word lo abre nativamente desde HTML). */
export async function descargarInformeWord(lead: Lead): Promise<void> {
  const { html, baseFilename } = await construirHtmlInforme(lead);
  // Word interpreta HTML con namespace de Office. Extensión .doc para máxima compat.
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.substring(html.indexOf("<head>"))}</html>`;
  const blob = new Blob(["\ufeff", wordHtml], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 100);
}
