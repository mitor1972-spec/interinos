// Lógica pura del endpoint hispajuris-export (sin acceso a BD ni a secretos).
// Se usa desde la ruta de servidor y desde los tests.
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

export const EXPORT_PATH = "/api/public/hispajuris-export";
export const WINDOW_SECONDS = 120;
export const MAX_BODY_BYTES = 8 * 1024;

export const bodySchema = z
  .object({
    action: z.enum(["summary", "cases"]),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().min(1).max(200).optional(),
    since: z.string().datetime({ offset: true }).optional(),
    include_client: z.boolean().optional(),
    portal_role: z.string().trim().min(1).max(40).optional(),
    portal_firm_code: z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/).optional(),
    portal_user_id: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

/** include_client solo se respeta con portal_role network_admin + firm_code + user_id. */
export const clientAccessGranted = (b: ExportBody) =>
  b.action === "cases" && b.include_client === true && b.portal_role === "network_admin" && !!b.portal_firm_code && !!b.portal_user_id;

export interface ClientFields {
  nombre: string | null;
  tipo_relacion: string | null;
  administracion: string | null;
  mensaje_libre: string | null;
}

export function resumen(s: string | null, max = 160): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

export function clientExtras(c: ClientFields | undefined) {
  const asunto = [c?.tipo_relacion, c?.administracion].map((x) => (x ?? "").trim()).filter(Boolean).join(" / ");
  return {
    client_name: (c?.nombre ?? "").trim() || null,
    asunto: asunto || null,
    summary: resumen(c?.mensaje_libre ?? null),
  };
}
export type ExportBody = z.infer<typeof bodySchema>;

export const sha256hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
export const hmacHex = (secret: string, s: string) =>
  createHmac("sha256", secret).update(s, "utf8").digest("hex");

export function signingString(ts: string, nonce: string, path: string, rawBody: string) {
  return `${ts}.${nonce}.POST.${path}.${sha256hex(rawBody)}`;
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a.toLowerCase(), "hex"), Buffer.from(b.toLowerCase(), "hex"));
}

/** Referencia opaca de un caso: 16 hex del HMAC del id. Nunca el id real. */
export const opaqueRef = (secret: string, id: string) => hmacHex(secret, `ref:${id}`).slice(0, 16);

export const encodeCursor = (createdAt: string) => Buffer.from(createdAt, "utf8").toString("base64url");
export function decodeCursor(c: string): string | null {
  try {
    const v = Buffer.from(c, "base64url").toString("utf8");
    return Number.isNaN(Date.parse(v)) ? null : v;
  } catch {
    return null;
  }
}

export interface SummaryRow {
  created_at: string;
  estado: string;
  semaforo: string;
  resultado_viabilidad: string;
  provincia: string | null;
  asignado_a: string | null;
  resultado_contacto: string | null;
  encargo_firmado: boolean | null;
  pago_completado: boolean | null;
  cobro_realizado: boolean | null;
  is_demo?: boolean | null;
}

export interface CaseRow {
  id: string;
  created_at: string;
  estado: string;
  semaforo: string;
  resultado_viabilidad: string;
  provincia: string | null;
  tipo_reclamacion: string | null;
  area_sector: string | null;
  tipo_relacion: string | null;
  asignado_a: string | null;
  portal_office_code?: string | null;
  is_demo?: boolean | null;
}

export const METRICS_DEFINITIONS = {
  total: "Número total de solicitudes registradas.",
  last_7d: "Solicitudes creadas en los últimos 7 días.",
  last_30d: "Solicitudes creadas en los últimos 30 días.",
  by_status: "Recuento por estado del caso (Nuevo, En estudio, Propuesta enviada, Cliente, Descartado).",
  by_traffic_light: "Recuento por semáforo del diagnóstico automático.",
  by_result: "Recuento por resultado de viabilidad (inviable, revision, viable, urgente).",
  assigned: "Solicitudes con abogado asignado.",
  unassigned: "Solicitudes sin abogado asignado.",
  contacted: "Estado distinto de 'Nuevo' o resultado de contacto distinto de 'pendiente'.",
  signed: "Estado 'Cliente' o encargo profesional marcado como firmado.",
  paid: "Pago completado o cobro marcado como realizado.",
  last_case_at: "Fecha de la solicitud más reciente.",
} as const;

export function buildSummary(allRows: SummaryRow[], now: Date) {
  const rows = allRows.filter((r) => !r.is_demo);
  const demoCount = allRows.length - rows.length;
  const t7 = now.getTime() - 7 * 864e5;
  const t30 = now.getTime() - 30 * 864e5;
  const by_status: Record<string, number> = {};
  const by_traffic_light: Record<string, number> = { verde: 0, ambar: 0, rojo: 0 };
  const by_result: Record<string, number> = {};
  const by_province: Record<string, number> = {};
  let last_7d = 0, last_30d = 0, assigned = 0, contacted = 0, signed = 0, paid = 0;
  let last: string | null = null;
  for (const r of rows) {
    const t = Date.parse(r.created_at);
    if (t >= t7) last_7d++;
    if (t >= t30) last_30d++;
    by_status[r.estado] = (by_status[r.estado] ?? 0) + 1;
    by_traffic_light[r.semaforo] = (by_traffic_light[r.semaforo] ?? 0) + 1;
    by_result[r.resultado_viabilidad] = (by_result[r.resultado_viabilidad] ?? 0) + 1;
    const p = (r.provincia ?? "").trim() || "Sin provincia";
    by_province[p] = (by_province[p] ?? 0) + 1;
    if (r.asignado_a) assigned++;
    if (r.estado !== "Nuevo" || (r.resultado_contacto && r.resultado_contacto !== "pendiente")) contacted++;
    if (r.estado === "Cliente" || r.encargo_firmado) signed++;
    if (r.pago_completado || r.cobro_realizado) paid++;
    if (!last || t > Date.parse(last)) last = r.created_at;
  }
  return {
    vertical_slug: "interinos",
    generated_at: now.toISOString(),
    metrics: {
      total: rows.length,
      last_7d,
      last_30d,
      by_status,
      by_traffic_light,
      by_result,
      assigned,
      unassigned: rows.length - assigned,
      contacted,
      signed,
      paid,
      last_case_at: last,
    },
    metrics_definitions: METRICS_DEFINITIONS,
    by_province,
    demo: { count: demoCount },
  };
}

/** Construye cada caso campo a campo (lista blanca). */
export function buildCase(row: CaseRow, secret: string, baseUrl: string) {
  const ref = opaqueRef(secret, row.id);
  return {
    ref,
    created_at: row.created_at,
    status: row.estado,
    traffic_light: row.semaforo,
    result: row.resultado_viabilidad,
    province: row.provincia,
    claim_type: row.tipo_reclamacion ?? row.area_sector ?? row.tipo_relacion ?? null,
    assigned: !!row.asignado_a,
    is_demo: !!row.is_demo,
    portal_office_code: row.portal_office_code ?? null,
    detail_url: `${baseUrl}/admin/casos?ref=${ref}`,
  };
}

export interface ExportDeps {
  keyId: string | undefined;
  secret: string | undefined;
  baseUrl: string;
  now: () => Date;
  insertNonce: (nonce: string, keyId: string) => Promise<"ok" | "duplicate">;
  cleanupNonces: () => Promise<void>;
  log: (e: { key_id: string | null; action: string | null; rows_returned: number | null; status: number; detail?: string | null }) => Promise<void>;
  fetchSummaryRows: () => Promise<SummaryRow[]>;
  fetchCases: (o: { limit: number; before?: string; since?: string }) => Promise<CaseRow[]>;
  fetchClientFields?: (ids: string[]) => Promise<Map<string, ClientFields>>;
}

export interface ExportRequest {
  method: string;
  path: string;
  headers: { get(name: string): string | null };
  rawBody: string;
}

export interface ExportResult {
  status: number;
  body: unknown;
}

const err = (status: number, error: string): ExportResult => ({ status, body: { error } });

export async function handleExport(req: ExportRequest, deps: ExportDeps): Promise<ExportResult> {
  const keyHeader = req.headers.get("x-bridge-key-id");
  const done = async (r: ExportResult, action: string | null, rows: number | null, detail?: string) => {
    try {
      await deps.log({ key_id: keyHeader && keyHeader === deps.keyId ? keyHeader : null, action, rows_returned: rows, status: r.status, ...(detail ? { detail } : {}) });
    } catch {
      /* el registro nunca rompe la respuesta */
    }
    return r;
  };

  if (req.method !== "POST") return done(err(405, "method_not_allowed"), null, null);
  if (!deps.keyId || !deps.secret) return done(err(401, "unauthorized"), null, null);
  if (req.rawBody.length > MAX_BODY_BYTES) return done(err(413, "payload_too_large"), null, null);

  const ts = req.headers.get("x-bridge-timestamp") ?? "";
  const nonce = req.headers.get("x-bridge-nonce") ?? "";
  const sig = req.headers.get("x-bridge-signature") ?? "";
  if (!keyHeader || keyHeader !== deps.keyId || !/^\d{9,11}$/.test(ts) || !/^[A-Za-z0-9_-]{8,128}$/.test(nonce) || !sig)
    return done(err(401, "unauthorized"), null, null);

  const nowS = Math.floor(deps.now().getTime() / 1000);
  if (Math.abs(nowS - Number(ts)) > WINDOW_SECONDS) return done(err(401, "unauthorized"), null, null);

  const expected = hmacHex(deps.secret, signingString(ts, nonce, req.path, req.rawBody));
  if (!safeEqualHex(sig, expected)) return done(err(401, "unauthorized"), null, null);

  await deps.cleanupNonces().catch(() => undefined);
  if ((await deps.insertNonce(nonce, keyHeader)) === "duplicate") return done(err(409, "replay"), null, null);

  let body: ExportBody;
  try {
    body = bodySchema.parse(JSON.parse(req.rawBody));
  } catch {
    return done(err(400, "bad_request"), null, null);
  }

  try {
    if (body.action === "summary") {
      const rows = await deps.fetchSummaryRows();
      return done({ status: 200, body: buildSummary(rows, deps.now()) }, "summary", rows.length);
    }
    let before: string | undefined;
    if (body.cursor) {
      const c = decodeCursor(body.cursor);
      if (!c) return done(err(400, "bad_request"), "cases", null);
      before = c;
    }
    const limit = body.limit ?? 50;
    const rows = await deps.fetchCases({ limit: limit + 1, before, since: body.since });
    const page = rows.slice(0, limit);
    const next = rows.length > limit ? encodeCursor(page[page.length - 1].created_at) : null;
    const cases = page.map((r) => buildCase(r, deps.secret!, deps.baseUrl));
    if (clientAccessGranted(body) && deps.fetchClientFields) {
      const map = await deps.fetchClientFields(page.map((r) => r.id));
      const withClient = cases.map((c, i) => ({ ...c, ...clientExtras(map.get(page[i].id)) }));
      const detail = `Listado consultado desde Portal Hispajuris (${body.portal_firm_code}, ${body.portal_role}, ${body.portal_user_id}), ${withClient.length} casos`;
      return done({ status: 200, body: { cases: withClient, next_cursor: next } }, "cases_client", withClient.length, detail);
    }
    return done({ status: 200, body: { cases, next_cursor: next } }, "cases", cases.length);
  } catch {
    return done(err(500, "internal_error"), body.action, null);
  }
}
