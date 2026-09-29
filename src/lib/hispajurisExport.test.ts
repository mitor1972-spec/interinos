import { describe, it, expect } from "vitest";
import {
  EXPORT_PATH,
  handleExport,
  hmacHex,
  signingString,
  type CaseRow,
  type ExportDeps,
  type SummaryRow,
} from "./hispajurisExport.core";

const KEY = "kid-test";
const SECRET = "s".repeat(64);
const NOW = new Date("2026-09-28T12:00:00Z");
const nowS = Math.floor(NOW.getTime() / 1000);

const PII = {
  nombre: "Maria Secreta Perez",
  email: "maria.secreta@example.com",
  telefono: "600111222",
  mensaje_libre: "MENSAJE_PRIVADO_XYZ",
  documentos_disponibles: ["DOC_PRIVADO"],
  pago_importe: 98765.43,
  diagnostico_mensaje: "DIAG_PRIVADO",
};

const caseRows = (n: number): CaseRow[] =>
  Array.from({ length: n }, (_, i) => ({
    ...(PII as object),
    id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    created_at: new Date(NOW.getTime() - i * 3600e3).toISOString(),
    estado: "Nuevo",
    semaforo: "verde",
    resultado_viabilidad: "viable",
    provincia: "Madrid",
    tipo_reclamacion: null,
    area_sector: "sanidad_publica",
    tipo_relacion: "interino",
    asignado_a: i % 2 ? "u1" : null,
  })) as CaseRow[];

function makeDeps(over: Partial<ExportDeps> = {}) {
  const nonces = new Set<string>();
  const logs: unknown[] = [];
  const deps: ExportDeps = {
    keyId: KEY,
    secret: SECRET,
    baseUrl: "https://interinos.asesor.legal",
    now: () => NOW,
    insertNonce: async (n) => (nonces.has(n) ? "duplicate" : (nonces.add(n), "ok")),
    cleanupNonces: async () => {},
    log: async (e) => void logs.push(e),
    fetchSummaryRows: async () =>
      caseRows(5).map((r) => ({ ...r, resultado_contacto: "pendiente", encargo_firmado: false, pago_completado: false, cobro_realizado: false })) as unknown as SummaryRow[],
    fetchCases: async ({ limit }) => caseRows(10).slice(0, limit),
    ...over,
  };
  return { deps, logs };
}

function signed(body: unknown, o: { ts?: number; nonce?: string; key?: string; secret?: string; path?: string; raw?: string } = {}) {
  const raw = o.raw ?? JSON.stringify(body);
  const ts = String(o.ts ?? nowS);
  const nonce = o.nonce ?? `nonce-${Math.random().toString(36).slice(2)}`;
  const sig = hmacHex(o.secret ?? SECRET, signingString(ts, nonce, o.path ?? EXPORT_PATH, raw));
  const h = new Headers({ "x-bridge-key-id": o.key ?? KEY, "x-bridge-timestamp": ts, "x-bridge-nonce": nonce, "x-bridge-signature": sig });
  return { method: "POST", path: EXPORT_PATH, headers: h, rawBody: raw };
}

describe("firma", () => {
  it("acepta firma válida", async () => {
    const { deps } = makeDeps();
    expect((await handleExport(signed({ action: "summary" }), deps)).status).toBe(200);
  });
  it("rechaza secreto, key-id, ruta o cuerpo alterados", async () => {
    const { deps } = makeDeps();
    expect((await handleExport(signed({ action: "summary" }, { secret: "otro" }), deps)).status).toBe(401);
    expect((await handleExport(signed({ action: "summary" }, { key: "otra" }), deps)).status).toBe(401);
    expect((await handleExport(signed({ action: "summary" }, { path: "/functions/v1/hispajuris-export" }), deps)).status).toBe(401);
    const r = signed({ action: "summary" });
    r.rawBody = JSON.stringify({ action: "cases" });
    expect((await handleExport(r, deps)).status).toBe(401);
  });
  it("sin secretos configurados → 401", async () => {
    const { deps } = makeDeps({ secret: undefined });
    expect((await handleExport(signed({ action: "summary" }), deps)).status).toBe(401);
  });
  it("método distinto de POST → 405", async () => {
    const { deps } = makeDeps();
    expect((await handleExport({ ...signed({ action: "summary" }), method: "GET" }, deps)).status).toBe(405);
  });
});

describe("ventana temporal", () => {
  it("±119 s OK, ±121 s 401", async () => {
    const { deps } = makeDeps();
    expect((await handleExport(signed({ action: "summary" }, { ts: nowS - 119 }), deps)).status).toBe(200);
    expect((await handleExport(signed({ action: "summary" }, { ts: nowS + 119 }), deps)).status).toBe(200);
    expect((await handleExport(signed({ action: "summary" }, { ts: nowS - 121 }), deps)).status).toBe(401);
    expect((await handleExport(signed({ action: "summary" }, { ts: nowS + 121 }), deps)).status).toBe(401);
  });
});

describe("replay", () => {
  it("nonce repetido → 409", async () => {
    const { deps } = makeDeps();
    const req = signed({ action: "summary" }, { nonce: "fixednonce123" });
    expect((await handleExport(req, deps)).status).toBe(200);
    expect((await handleExport(req, deps)).status).toBe(409);
  });
});

describe("validación Zod", () => {
  const bad = [
    { action: "delete" },
    { action: "cases", limit: 0 },
    { action: "cases", limit: 201 },
    { action: "cases", since: "ayer" },
    { action: "cases", extra: 1 },
    { action: "cases", cursor: "!!!" },
  ];
  for (const b of bad)
    it(`rechaza ${JSON.stringify(b)}`, async () => {
      const { deps } = makeDeps();
      expect((await handleExport(signed(b), deps)).status).toBe(400);
    });
  it("JSON inválido → 400", async () => {
    const { deps } = makeDeps();
    expect((await handleExport(signed(null, { raw: "{no" }), deps)).status).toBe(400);
  });
});

describe("sin datos personales", () => {
  const forbidden = [...Object.values(PII).flat().map(String), "nombre", "email", "telefono", "mensaje_libre", "documentos", "pago_importe", "diagnostico", "00000000-0000"];
  it("summary y cases no contienen PII ni ids reales", async () => {
    const { deps, logs } = makeDeps();
    const s = await handleExport(signed({ action: "summary" }), deps);
    const c = await handleExport(signed({ action: "cases", limit: 3 }), deps);
    for (const out of [JSON.stringify(s.body), JSON.stringify(c.body), JSON.stringify(logs)])
      for (const f of forbidden) expect(out).not.toContain(f);
    const body = c.body as { cases: Record<string, unknown>[]; next_cursor: string | null };
    expect(body.cases).toHaveLength(3);
    expect(Object.keys(body.cases[0]).sort()).toEqual(
      ["assigned", "claim_type", "created_at", "detail_url", "is_demo", "portal_office_code", "province", "ref", "result", "status", "traffic_light"].sort(),
    );
    expect(body.cases[0].ref).toMatch(/^[0-9a-f]{16}$/);
    expect(body.cases[0].detail_url).toMatch(/\/admin\/casos\?ref=[0-9a-f]{16}$/);
    expect(body.next_cursor).toBeTruthy();
    expect((s.body as { metrics_definitions: object }).metrics_definitions).toBeTruthy();
  });
});

describe("include_client", () => {
  const clientDeps = () =>
    makeDeps({
      fetchClientFields: async (ids) =>
        new Map(ids.map((id) => [id, { nombre: PII.nombre, tipo_relacion: "interino", administracion: "SERMAS", mensaje_libre: "x".repeat(300) }])),
    });
  it("sin network_admin se ignora (salida idéntica)", async () => {
    const { deps } = clientDeps();
    for (const extra of [{}, { include_client: true }, { include_client: true, portal_role: "firm_admin", portal_firm_code: "F1", portal_user_id: "u" }, { include_client: true, portal_role: "network_admin" }]) {
      const r = await handleExport(signed({ action: "cases", limit: 2, ...extra }), deps);
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.body)).not.toContain(PII.nombre);
      expect(JSON.stringify(r.body)).not.toContain("client_name");
    }
  });
  it("network_admin recibe nombre, asunto y resumen ≤160, sin email/teléfono; un registro", async () => {
    const { deps, logs } = clientDeps();
    const r = await handleExport(signed({ action: "cases", limit: 3, include_client: true, portal_role: "network_admin", portal_firm_code: "HJ", portal_user_id: "u1" }), deps);
    const c = (r.body as { cases: Record<string, string>[] }).cases;
    expect(c[0].client_name).toBe(PII.nombre);
    expect(c[0].asunto).toBe("interino / SERMAS");
    expect(c[0].summary.length).toBeLessThanOrEqual(160);
    const out = JSON.stringify(r.body);
    expect(out).not.toContain(PII.email);
    expect(out).not.toContain(PII.telefono);
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).toContain("3 casos");
    expect(JSON.stringify(logs)).not.toContain(PII.nombre);
  });
});
