import { supabase } from "@/integrations/supabase/client";
import {
  semaforoConfig,
  perfilConfig,
  reclamacionesPorPerfil,
  docsCompletos,
  type Lead,
} from "@/lib/leads";

export interface BorradorEmail {
  to: string;
  cc: string;
  subject: string;
  message: string;
}

/** Construye el asunto y el cuerpo automático del email al abogado. */
export function construirBorradorEmailLead(
  lead: Lead,
  abogado: { nombre?: string | null; email?: string | null } | null,
  origin?: string,
): BorradorEmail {
  const sem = semaforoConfig(lead.semaforo);
  const per = perfilConfig(lead.perfil);

  const subject = `Nuevo caso asignado — ${lead.nombre} — ${sem.label} — ${lead.provincia}`;

  const docs =
    lead.documentos_disponibles && lead.documentos_disponibles.length > 0
      ? lead.documentos_disponibles.join(", ")
      : "Sin documentación marcada";
  const docsCompletosTxt = docsCompletos(lead.documentos_disponibles)
    ? "Sí"
    : "No";

  const reclam = reclamacionesPorPerfil(lead.perfil)
    .map((r) => `  • ${r}`)
    .join("\n");

  const fichaUrl =
    (origin || (typeof window !== "undefined" ? window.location.origin : "")) +
    `/admin/casos?lead=${lead.id}`;

  const motivoUrgencia = lead.urgencia
    ? "Sí — caso prioritario, plazos en marcha"
    : "No";

  const saludo = abogado?.nombre
    ? `Estimado/a ${abogado.nombre},`
    : "Estimado/a abogado/a,";

  const message = `${saludo}

Le remitimos el siguiente caso para su revisión y gestión:

DATOS DEL CLIENTE
Nombre: ${lead.nombre}
Email: ${lead.email}
Teléfono: ${lead.telefono}
Provincia: ${lead.provincia}

DATOS DEL CASO
Tipo de relación: ${lead.tipo_relacion}
Administración: ${lead.administracion}
Antigüedad: ${lead.anos_servicio} ${lead.anos_servicio === 1 ? "año" : "años"}
Contratos sucesivos: ${lead.contratos_sucesivos ? "Sí" : "No"}
Situación actual: ${lead.situacion_actual}
Urgencia: ${motivoUrgencia}

DIAGNÓSTICO
Semáforo: ${sem.emoji} ${sem.label}
Puntuación: ${lead.puntuacion_viabilidad}/13
Perfil detectado: ${per.label}

Qué podría reclamar:
${reclam}

DOCUMENTACIÓN
Documentos marcados: ${docs}
Documentación completa: ${docsCompletosTxt}
Pago Fase I: ${lead.pago_completado ? "Completado" : "Pendiente"}

NOTAS DEL ADMINISTRADOR
${lead.notas_abogado?.trim() || "(sin notas)"}

Para acceder al expediente completo:
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
