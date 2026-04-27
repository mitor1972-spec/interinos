import type { Lead } from "@/lib/leads";

/**
 * ID sintético para el caso DEMO. Tiene formato UUID válido pero está
 * reservado — no se usa nunca en la base de datos real.
 */
export const DEMO_LEAD_ID = "00000000-0000-0000-0000-000000000d00";

/**
 * Devuelve true si un id corresponde al caso DEMO.
 */
export function esLeadDemo(id: string | null | undefined): boolean {
  return id === DEMO_LEAD_ID;
}

/**
 * Construye un Lead ficticio realista para que admin/abogado puedan
 * previsualizar el panel de cliente sin necesidad de tener un lead real
 * asociado a su email. NO se persiste en base de datos.
 */
export function buildLeadDemo(emailStaff: string | null | undefined): Lead {
  const now = new Date().toISOString();
  return {
    id: DEMO_LEAD_ID,
    nombre: "María García Demo",
    email: emailStaff ?? "demo@asesor.legal",
    telefono: "666 000 000",
    provincia: "Madrid",
    tipo_relacion: "Funcionario/a interino/a",
    administracion: "Sanidad pública",
    anos_servicio: 7,
    situacion_actual: "Sigo trabajando como interino/a",
    contratos_sucesivos: true,
    urgencia: false,
    documentos_disponibles: [],
    semaforo: "verde",
    puntuacion_viabilidad: 9,
    resultado_viabilidad: "viable",
    estado: "En estudio",
    diagnostico_titulo: "Caso viable — Funcionaria interina con contratos sucesivos",
    diagnostico_mensaje:
      "Tu situación encaja claramente en la doctrina del TJUE sobre abuso de temporalidad. Recomendamos iniciar reclamación.",
    mensaje_libre:
      "Llevo 7 años como enfermera interina en el Hospital La Paz. He tenido 12 nombramientos sucesivos siempre para la misma plaza.",
    perfil: "funcionario",
    asignado_a: null,
    notas_abogado: null,
    pago_completado: false,
    stripe_payment_id: null,
    metodo_pago: null,
    pago_fecha: null,
    pago_importe: null,
    pago_referencia: null,
    revisado: false,
    revisado_at: null,
    area_sector: "sanidad",
    motivo_especifico: null,
    urgencia_percibida: 3,
    resultado_contacto: "pendiente",
    siguiente_accion: null,
    profesional_interviniente: null,
    fecha_solicitud_inicial: null,
    servicio_especifico: null,
    accion_pendiente: null,
    encargo_firmado: false,
    cobro_realizado: false,
    factura_emitida: false,
    apud_acta_recibido: false,
    tipo_reclamacion: null,
    notificacion_docs_completos_at: null,
    created_at: now,
    updated_at: now,
  } as unknown as Lead;
}
