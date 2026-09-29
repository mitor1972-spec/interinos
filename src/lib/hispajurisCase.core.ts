// Lógica pura de los endpoints hispajuris-case y hispajuris-case-update.
// Sin acceso a BD ni secretos: todo llega por dependencias (testeable).
import { z } from "zod";
import { MAX_BODY_BYTES, WINDOW_SECONDS, hmacHex, opaqueRef, safeEqualHex, signingString } from "./hispajurisExport.core";

export const CASE_PATH = "/api/public/hispajuris-case";
export const CASE_UPDATE_PATH = "/api/public/hispajuris-case-update";
export const RATE_LIMIT_PER_MIN = 60;
export const ALLOWED_STATUSES = ["Nuevo", "En estudio", "Propuesta enviada", "Cliente", "Descartado"] as const;

const short = (max: number) => z.string().trim().min(1).max(max);
const code = z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/);
const caseKey = z.string().regex(/^[0-9a-f]{16}$/);
const requestId = z.string().regex(/^[A-Za-z0-9_.:-]{8,100}$/);

export const caseBodySchema = z
  .object({
    case_key: caseKey,
    portal_firm_code: code,
    portal_user_id: short(100),
    portal_role: short(40),
    request_id: requestId,
  })
  .strict();

export const updateBodySchema = z
  .object({
    case_key: caseKey,
    request_id: requestId,
    portal_firm_code: code,
    portal_user_id: short(100),
    actor_name: short(120),
    status: z.enum(ALLOWED_STATUSES).optional(),
    portal_assignment: z
      .object({
        office_code: code,
        office_name: short(200),
        lawyer_name: short(200),
        lawyer_email: z.string().trim().toLowerCase().email().max(254),
      })
      .strict()
      .nullable()
      .optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

export type CaseBody = z.infer<typeof caseBodySchema>;
export type UpdateBody = z.infer<typeof updateBodySchema>;

/* eslint-disable @typescript-eslint/no-explicit-any */
export type LeadRow = Record<string, any> & { id: string; estado: string; created_at: string; updated_at: string };

export interface DetailExtras {
  verticalUser: { nombre: string; email: string } | null;
  documents: { nombre_original: string; categoria: string; created_at: string; estado?: string | null }[];
  historial: { created_at: string; campo: string; valor_anterior: string | null; valor_nuevo: string | null; usuario_email: string | null; origen: string | null }[];
}

const TIMELINE_LABELS: Record<string, string> = {
  estado: "Estado",
  asignado_a: "Abogado asignado",
  portal_asignacion: "Asignación en portal",
  portal_consulta: "Consulta",
  portal_actualizacion: "Actualización",
  portal_nota: "Nota",
  notas_abogado: "Notas",
};

export function buildCaseDetail(lead: LeadRow, extras: DetailExtras, secret: string) {
  const timeline = [
    { fecha: lead.created_at, tipo: "creacion", texto: "Solicitud recibida desde el formulario", origen: "vertical" as const },
    ...extras.historial.map((h) => {
      const label = TIMELINE_LABELS[h.campo] ?? h.campo;
      const texto = h.campo.startsWith("portal_")
        ? (h.valor_nuevo ?? label)
        : `${label}: ${h.valor_anterior ?? "—"} → ${h.valor_nuevo ?? "—"}`;
      return { fecha: h.created_at, tipo: h.campo, texto, origen: (h.origen === "portal" ? "portal" : "vertical") as "portal" | "vertical" };
    }),
  ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));

  return {
    case_key: opaqueRef(secret, lead.id),
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    status: lead.estado,
    allowed_statuses: [...ALLOWED_STATUSES],
    is_demo: !!lead.is_demo,
    client: {
      nombre: lead.nombre,
      email: lead.email,
      telefono: lead.telefono,
      provincia: lead.provincia,
      tipo_relacion: lead.tipo_relacion,
      administracion: lead.administracion,
      anos_servicio: lead.anos_servicio,
      contratos_sucesivos: lead.contratos_sucesivos,
      situacion_actual: lead.situacion_actual,
      documentos_disponibles: lead.documentos_disponibles ?? [],
      urgencia: lead.urgencia,
      perfil: lead.perfil,
    },
    message: lead.mensaje_libre ?? null,
    diagnosis: {
      traffic_light: lead.semaforo,
      score: lead.puntuacion_viabilidad,
      result: lead.resultado_viabilidad,
      title: lead.diagnostico_titulo ?? null,
      text: lead.diagnostico_mensaje ?? null,
      possible_claim: lead.tipo_reclamacion ?? null,
    },
    management: {
      tipo_reclamacion: lead.tipo_reclamacion ?? null,
      motivo_especifico: lead.motivo_especifico ?? null,
      area_sector: lead.area_sector ?? null,
      urgencia_percibida: lead.urgencia_percibida ?? null,
      resultado_contacto: lead.resultado_contacto ?? null,
      siguiente_accion: lead.siguiente_accion ?? null,
      fecha_solicitud_inicial: lead.fecha_solicitud_inicial ?? null,
      servicio_especifico: lead.servicio_especifico ?? null,
      accion_pendiente: lead.accion_pendiente ?? null,
      encargo_firmado: !!lead.encargo_firmado,
      cobro_realizado: !!lead.cobro_realizado,
      factura_emitida: !!lead.factura_emitida,
      apud_acta_recibido: !!lead.apud_acta_recibido,
      notas: lead.notas_abogado ?? null,
    },
    assignment: {
      vertical_user: extras.verticalUser,
      portal: lead.portal_office_code
        ? {
            office_code: lead.portal_office_code,
            office_name: lead.portal_office_name ?? null,
            lawyer_name: lead.portal_lawyer_name ?? null,
            lawyer_email: lead.portal_lawyer_email ?? null,
            assigned_at: lead.portal_assigned_at ?? null,
            assigned_by: lead.portal_assigned_by ?? null,
          }
        : null,
    },
    payments: {
      fase_1: {
        estado: lead.pago_completado || lead.cobro_realizado ? "pagado" : "pendiente",
        metodo: lead.metodo_pago ?? null,
        fecha: lead.pago_fecha ?? null,
        importe: lead.pago_importe ?? null,
      },
    },
    documents: extras.documents.map((d) => ({ nombre: d.nombre_original, tipo: d.categoria, fecha: d.created_at, estado: d.estado ?? null })),
    timeline,
  };
}

export interface BridgeRequest {
  method: string;
  path: string;
  headers: { get(name: string): string | null };
  rawBody: string;
}
export interface BridgeResult {
  status: number;
  body: unknown;
}
const err = (status: number, error: string): BridgeResult => ({ status, body: { error } });

export interface BridgeAuthDeps {
  keyId: string | undefined;
  secret: string | undefined;
  now: () => Date;
  insertNonce: (nonce: string, keyId: string) => Promise<"ok" | "duplicate">;
  cleanupNonces: () => Promise<void>;
  recentCalls: (keyId: string) => Promise<number>;
  log: (e: { key_id: string | null; action: string | null; rows_returned: number | null; status: number }) => Promise<void>;
}

/** Verifica firma, ventana, nonce y límite. Devuelve null si todo es correcto. */
async function verify(req: BridgeRequest, deps: BridgeAuthDeps): Promise<BridgeResult | null> {
  if (req.method !== "POST") return err(405, "method_not_allowed");
  if (!deps.keyId || !deps.secret) return err(401, "unauthorized");
  if (req.rawBody.length > MAX_BODY_BYTES) return err(413, "payload_too_large");
  const key = req.headers.get("x-bridge-key-id") ?? "";
  const ts = req.headers.get("x-bridge-timestamp") ?? "";
  const nonce = req.headers.get("x-bridge-nonce") ?? "";
  const sig = req.headers.get("x-bridge-signature") ?? "";
  if (key !== deps.keyId || !/^\d{9,11}$/.test(ts) || !/^[A-Za-z0-9_-]{8,128}$/.test(nonce) || !sig) return err(401, "unauthorized");
  if (Math.abs(Math.floor(deps.now().getTime() / 1000) - Number(ts)) > WINDOW_SECONDS) return err(401, "unauthorized");
  if (!safeEqualHex(sig, hmacHex(deps.secret, signingString(ts, nonce, req.path, req.rawBody)))) return err(401, "unauthorized");
  await deps.cleanupNonces().catch(() => undefined);
  if ((await deps.insertNonce(nonce, key)) === "duplicate") return err(409, "replay");
  if ((await deps.recentCalls(key)) >= RATE_LIMIT_PER_MIN) return err(429, "rate_limited");
  return null;
}

export interface CaseDeps extends BridgeAuthDeps {
  findLead: (caseKey: string) => Promise<LeadRow | null>;
  loadExtras: (lead: LeadRow) => Promise<DetailExtras>;
  addHistory: (leadId: string, entries: { campo: string; valor_anterior: string | null; valor_nuevo: string | null; usuario_email: string | null }[]) => Promise<void>;
}

export interface UpdateDeps extends CaseDeps {
  claimRequest: (requestId: string, leadId: string) => Promise<"ok" | "duplicate">;
  releaseRequest: (requestId: string) => Promise<void>;
  findLawyerUserId: (email: string) => Promise<string | null>;
  patchLead: (leadId: string, patch: Record<string, unknown>) => Promise<LeadRow>;
}

function wrapLog(deps: BridgeAuthDeps, req: BridgeRequest) {
  const key = req.headers.get("x-bridge-key-id");
  return async (r: BridgeResult, action: string, rows: number | null) => {
    try {
      await deps.log({ key_id: key && key === deps.keyId ? key : null, action, rows_returned: rows, status: r.status });
    } catch {
      /* nunca rompe */
    }
    return r;
  };
}

export async function handleCase(req: BridgeRequest, deps: CaseDeps): Promise<BridgeResult> {
  const done = wrapLog(deps, req);
  const v = await verify(req, deps);
  if (v) return done(v, "case", null);
  let body: CaseBody;
  try {
    body = caseBodySchema.parse(JSON.parse(req.rawBody));
  } catch {
    return done(err(400, "bad_request"), "case", null);
  }
  try {
    const lead = await deps.findLead(body.case_key);
    if (!lead) return done(err(404, "not_found"), "case", 0);
    await deps.addHistory(lead.id, [
      { campo: "portal_consulta", valor_anterior: null, valor_nuevo: `Consultado desde Portal Hispajuris (${body.portal_firm_code}, ${body.portal_role})`, usuario_email: null },
    ]);
    const extras = await deps.loadExtras(lead);
    return done({ status: 200, body: buildCaseDetail(lead, extras, deps.secret!) }, "case", 1);
  } catch {
    return done(err(500, "internal_error"), "case", null);
  }
}

export async function handleCaseUpdate(req: BridgeRequest, deps: UpdateDeps): Promise<BridgeResult> {
  const done = wrapLog(deps, req);
  const v = await verify(req, deps);
  if (v) return done(v, "case_update", null);
  let body: UpdateBody;
  try {
    body = updateBodySchema.parse(JSON.parse(req.rawBody));
  } catch {
    return done(err(400, "bad_request"), "case_update", null);
  }
  try {
    let lead = await deps.findLead(body.case_key);
    if (!lead) return done(err(404, "not_found"), "case_update", 0);

    // Idempotencia: el mismo request_id no se aplica dos veces.
    if ((await deps.claimRequest(body.request_id, lead.id)) === "duplicate") {
      const extras = await deps.loadExtras(lead);
      return done({ status: 200, body: { ...buildCaseDetail(lead, extras, deps.secret!), idempotent_replay: true } }, "case_update", 0);
    }

    try {
      const who = `${body.actor_name} (${body.portal_firm_code})`;
      const patch: Record<string, unknown> = {};
      const hist: { campo: string; valor_anterior: string | null; valor_nuevo: string | null; usuario_email: string | null }[] = [];

      if (body.status && body.status !== lead.estado) {
        patch.estado = body.status;
        hist.push({ campo: "estado", valor_anterior: lead.estado, valor_nuevo: body.status, usuario_email: null });
      }
      if (body.portal_assignment === null) {
        Object.assign(patch, {
          portal_office_code: null, portal_office_name: null, portal_lawyer_name: null,
          portal_lawyer_email: null, portal_assigned_at: null, portal_assigned_by: null,
        });
        // Solo se quita aquí si el abogado actual es el que asignó el portal (mismo email).
        if (lead.asignado_a && lead.portal_lawyer_email) {
          const prevUid = await deps.findLawyerUserId(lead.portal_lawyer_email);
          if (prevUid && prevUid === lead.asignado_a) {
            patch.asignado_a = null;
            hist.push({ campo: "asignado_a", valor_anterior: lead.asignado_a, valor_nuevo: null, usuario_email: null });
          }
        }
        hist.push({ campo: "portal_asignacion", valor_anterior: lead.portal_office_code ?? null, valor_nuevo: `Desasignado en el portal por ${who}`, usuario_email: null });
      } else if (body.portal_assignment) {
        const a = body.portal_assignment;
        Object.assign(patch, {
          portal_office_code: a.office_code, portal_office_name: a.office_name,
          portal_lawyer_name: a.lawyer_name, portal_lawyer_email: a.lawyer_email,
          portal_assigned_at: deps.now().toISOString(), portal_assigned_by: who,
        });
        hist.push({ campo: "portal_asignacion", valor_anterior: lead.portal_office_code ?? null, valor_nuevo: `Asignado en el portal a ${a.lawyer_name} · ${a.office_name} (${a.office_code})`, usuario_email: null });
        const uid = await deps.findLawyerUserId(a.lawyer_email);
        if (uid && uid !== lead.asignado_a) {
          patch.asignado_a = uid;
          hist.push({ campo: "asignado_a", valor_anterior: lead.asignado_a ?? null, valor_nuevo: uid, usuario_email: null });
        }
      }
      if (body.note) hist.push({ campo: "portal_nota", valor_anterior: null, valor_nuevo: `Nota de ${who}: ${body.note}`, usuario_email: null });
      hist.push({ campo: "portal_actualizacion", valor_anterior: null, valor_nuevo: `Actualizado desde Portal Hispajuris por ${body.actor_name} (${body.portal_firm_code})`, usuario_email: null });

      if (Object.keys(patch).length) lead = await deps.patchLead(lead.id, patch);
      await deps.addHistory(lead.id, hist);
    } catch (e) {
      await deps.releaseRequest(body.request_id).catch(() => undefined);
      throw e;
    }
    const extras = await deps.loadExtras(lead);
    return done({ status: 200, body: buildCaseDetail(lead, extras, deps.secret!) }, "case_update", 1);
  } catch {
    return done(err(500, "internal_error"), "case_update", null);
  }
}
