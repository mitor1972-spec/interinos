import type { Lead } from "@/lib/leads";

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const TEL_RE = /^[+0-9 ()\-./]{6,}$/;

export interface CompletitudDetalle {
  total: number; // 0..100
  contacto: { score: number; max: number; checks: { label: string; ok: boolean }[] };
  caso: { score: number; max: number; checks: { label: string; ok: boolean }[] };
  documentos: { score: number; max: number; ok: boolean };
  pago: { score: number; max: number; ok: boolean };
}

/**
 * Calcula el % de completitud de un caso.
 * Pesos: contacto 30 + caso 20 + documentos 30 + pago 20 = 100.
 */
export function calcularCompletitud(
  lead: Lead,
  documentosCount: number,
): CompletitudDetalle {
  // ---- Contacto (30) ----
  const contactoChecks = [
    { label: "Nombre", ok: !!lead.nombre && lead.nombre.trim().length >= 2 },
    { label: "Email válido", ok: EMAIL_RE.test((lead.email ?? "").trim()) },
    { label: "Teléfono válido", ok: TEL_RE.test((lead.telefono ?? "").trim()) },
    { label: "Provincia", ok: !!lead.provincia && lead.provincia.trim().length >= 2 },
  ];
  const contactoOk = contactoChecks.filter((c) => c.ok).length;
  const contactoScore = Math.round((contactoOk / contactoChecks.length) * 30);

  // ---- Caso (20) ----
  const casoChecks = [
    { label: "Tipo de relación", ok: !!lead.tipo_relacion?.trim() },
    { label: "Administración", ok: !!lead.administracion?.trim() },
    { label: "Años de servicio", ok: typeof lead.anos_servicio === "number" && lead.anos_servicio > 0 },
    { label: "Situación actual", ok: !!lead.situacion_actual?.trim() },
    { label: "Perfil definido", ok: lead.perfil !== "desconocido" },
  ];
  const casoOk = casoChecks.filter((c) => c.ok).length;
  const casoScore = Math.round((casoOk / casoChecks.length) * 20);

  // ---- Documentos (30) ----
  const docsOk = documentosCount > 0;
  const docsScore = docsOk ? 30 : 0;

  // ---- Pago (20) ----
  const pagoOk = !!lead.pago_completado;
  const pagoScore = pagoOk ? 20 : 0;

  const total = Math.min(100, contactoScore + casoScore + docsScore + pagoScore);

  return {
    total,
    contacto: { score: contactoScore, max: 30, checks: contactoChecks },
    caso: { score: casoScore, max: 20, checks: casoChecks },
    documentos: { score: docsScore, max: 30, ok: docsOk },
    pago: { score: pagoScore, max: 20, ok: pagoOk },
  };
}

export function colorBarra(total: number): string {
  if (total >= 80) return "bg-success";
  if (total >= 50) return "bg-accent";
  if (total >= 25) return "bg-warning";
  return "bg-destructive";
}
