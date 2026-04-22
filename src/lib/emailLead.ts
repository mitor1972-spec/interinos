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
  message: string;
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

/** Construye el asunto y el cuerpo automático del email al abogado. */
export function construirBorradorEmailLead(
  lead: Lead,
  abogado: { nombre?: string | null; email?: string | null } | null,
  documentosSubidos: LeadDocumento[] = [],
  origin?: string,
): BorradorEmail {
  const sem = semaforoConfig(lead.semaforo);
  const per = perfilConfig(lead.perfil);

  const subject = `Nuevo caso asignado — ${lead.nombre} — ${sem.label} — ${lead.provincia}`;

  // Documentación marcada por el cliente
  const docsMarcados =
    lead.documentos_disponibles && lead.documentos_disponibles.length > 0
      ? lead.documentos_disponibles.map((d) => `  • ${d}`).join("\n")
      : `  • ${NO_FACILITADO}`;

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

  // Documentos subidos a la plataforma
  const baseOrigin =
    origin || (typeof window !== "undefined" ? window.location.origin : "");

  const docsSubidosTxt =
    documentosSubidos.length > 0
      ? documentosSubidos
          .map(
            (d) =>
              `  • ${d.nombre_original} [${categoriaLabel(d.categoria)}] — ${baseOrigin}/admin/casos?lead=${lead.id}`,
          )
          .join("\n")
      : `  • Ningún documento subido a la plataforma`;

  const reclam = reclamacionesPorPerfil(lead.perfil)
    .map((r) => `  • ${r}`)
    .join("\n");

  const fichaUrl = `${baseOrigin}/admin/casos?lead=${lead.id}`;

  const motivoUrgencia = lead.urgencia
    ? "Sí — caso prioritario, plazos en marcha"
    : "No";

  const saludo = abogado?.nombre
    ? `Estimado/a ${abogado.nombre},`
    : "Estimado/a abogado/a,";

  const mensajeCliente =
    lead.mensaje_libre && lead.mensaje_libre.trim().length > 0
      ? lead.mensaje_libre.trim()
      : "El cliente no facilitó información adicional";

  const notasAdmin =
    lead.notas_abogado && lead.notas_abogado.trim().length > 0
      ? lead.notas_abogado.trim()
      : "Sin notas";

  const abogadoAsignado = abogado?.nombre
    ? abogado.nombre
    : abogado?.email || "Sin asignar";

  // Campos de gestión interna que aún no existen en la BD —
  // se muestran como "No facilitado" para reservar el bloque.
  const tipoReclamacion = NO_FACILITADO;
  const resultadoContacto = NO_FACILITADO;
  const siguienteAccion = NO_FACILITADO;
  const urgenciaPercibida = NO_FACILITADO;
  const encargoFirmado = NO_FACILITADO;
  const cobroRealizado = lead.pago_completado ? "Sí" : "No";
  const facturaEmitida = NO_FACILITADO;
  const apudActaRecibido = NO_FACILITADO;

  const message = `${saludo}

Le remitimos el siguiente caso para su revisión y gestión.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS PERSONALES DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: ${val(lead.nombre)}
Email: ${val(lead.email)}
Teléfono: ${val(lead.telefono)}
Provincia: ${val(lead.provincia)}
Fecha de solicitud: ${formatDate(lead.created_at)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS DEL CASO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo de relación: ${val(lead.tipo_relacion)}
Administración: ${val(lead.administracion)}
Antigüedad: ${lead.anos_servicio ?? 0} ${lead.anos_servicio === 1 ? "año" : "años"}
Contratos o nombramientos sucesivos: ${siNo(lead.contratos_sucesivos)}
Situación actual: ${val(lead.situacion_actual)}
Urgencia declarada: ${motivoUrgencia}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MENSAJE DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${mensajeCliente}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNÓSTICO AUTOMÁTICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Semáforo: ${sem.emoji} ${sem.label}
Puntuación de viabilidad: ${lead.puntuacion_viabilidad}/13
Perfil detectado: ${per.label}

Qué podría reclamar según su perfil:
${reclam}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTACIÓN MARCADA POR EL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Documentos que indica tener disponibles:
${docsMarcados}

Documentación completa: ${docsCompletosTxt}

Documentos subidos a la plataforma:
${docsSubidosTxt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GESTIÓN INTERNA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estado del caso: ${val(lead.estado)}
Pago Fase I: ${lead.pago_completado ? "Completado" : "Pendiente"}
Abogado asignado: ${abogadoAsignado}
Tipo de reclamación (gestión): ${tipoReclamacion}
Resultado contacto: ${resultadoContacto}
Siguiente acción: ${siguienteAccion}
Urgencia percibida (1-5): ${urgenciaPercibida}
Encargo firmado: ${encargoFirmado}
Cobro realizado: ${cobroRealizado}
Factura emitida: ${facturaEmitida}
Apud Acta recibido: ${apudActaRecibido}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTAS INTERNAS DEL ADMINISTRADOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${notasAdmin}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCESO AL EXPEDIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ficha completa en la plataforma:
${fichaUrl}

Atentamente,
Secretariado Hispajuris
empleopublico@hispajuris.es`;

  return {
    to: abogado?.email || "",
    cc: "",
    subject,
    message,
  };
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
