// Lógica pura de hispajuris-lawyers y hispajuris-verify-credentials.
// Misma firma HMAC que hispajuris-export. Nunca maneja ni devuelve contraseñas guardadas.
import { z } from "zod";
import { MAX_BODY_BYTES, WINDOW_SECONDS, hmacHex, safeEqualHex, signingString } from "./hispajurisExport.core";

export const LAWYERS_PATH = "/api/public/hispajuris-lawyers";
export const VERIFY_PATH = "/api/public/hispajuris-verify-credentials";
export const EMAIL_LIMIT = 5; // por email cada 15 min
export const EMAIL_WINDOW_MS = 15 * 60e3;
export const GLOBAL_LIMIT = 30; // total por minuto
export const MIN_VERIFY_MS = 900; // tiempo mínimo de respuesta (no revela si el email existe)

export const userKey = (secret: string, id: string) => hmacHex(secret, `user:${id}`).slice(0, 16);
export const emailHash = (secret: string, email: string) => hmacHex(secret, `email:${email.trim().toLowerCase()}`);

export const lawyersBodySchema = z.object({ request_id: z.string().regex(/^[A-Za-z0-9_.:-]{8,100}$/).optional() }).strict();
export const verifyBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(200),
    request_id: z.string().regex(/^[A-Za-z0-9_.:-]{8,100}$/),
  })
  .strict();

export interface PanelUser {
  id: string;
  name: string | null;
  email: string;
  role: "lawyer" | "admin";
  active: boolean;
  cases_assigned: number;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AccessDeps {
  keyId: string | undefined;
  secret: string | undefined;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  insertNonce: (nonce: string, keyId: string) => Promise<"ok" | "duplicate">;
  log: (e: { key_id: string | null; action: string | null; rows_returned: number | null; status: number }) => Promise<void>;
  listPanelUsers: () => Promise<PanelUser[]>;
  countAttempts: (o: { emailHash?: string; sinceMs: number }) => Promise<number>;
  recordAttempt: (emailHash: string, outcome: string) => Promise<void>;
  /** Comprueba email+contraseña y cierra la sesión creada. Devuelve el id o null. */
  checkPassword: (email: string, password: string) => Promise<string | null>;
  findPanelUser: (id: string) => Promise<PanelUser | null>;
}

export interface AccessRequest {
  method: string;
  path: string;
  headers: { get(name: string): string | null };
  rawBody: string;
}
export interface AccessResult { status: number; body: unknown }
const err = (status: number, error: string): AccessResult => ({ status, body: { error } });

async function authenticate(req: AccessRequest, deps: AccessDeps): Promise<AccessResult | null> {
  if (req.method !== "POST") return err(405, "method_not_allowed");
  if (!deps.keyId || !deps.secret) return err(401, "unauthorized");
  if (req.rawBody.length > MAX_BODY_BYTES) return err(413, "payload_too_large");
  const key = req.headers.get("x-bridge-key-id");
  const ts = req.headers.get("x-bridge-timestamp") ?? "";
  const nonce = req.headers.get("x-bridge-nonce") ?? "";
  const sig = req.headers.get("x-bridge-signature") ?? "";
  if (!key || key !== deps.keyId || !/^\d{9,11}$/.test(ts) || !/^[A-Za-z0-9_-]{8,128}$/.test(nonce) || !sig) return err(401, "unauthorized");
  if (Math.abs(Math.floor(deps.now().getTime() / 1000) - Number(ts)) > WINDOW_SECONDS) return err(401, "unauthorized");
  if (!safeEqualHex(sig, hmacHex(deps.secret, signingString(ts, nonce, req.path, req.rawBody)))) return err(401, "unauthorized");
  if ((await deps.insertNonce(nonce, key)) === "duplicate") return err(409, "replay");
  return null;
}

function withLog(req: AccessRequest, deps: AccessDeps) {
  const key = req.headers.get("x-bridge-key-id");
  return async (r: AccessResult, action: string | null, rows: number | null) => {
    try {
      await deps.log({ key_id: key && key === deps.keyId ? key : null, action, rows_returned: rows, status: r.status });
    } catch { /* nunca rompe la respuesta */ }
    return r;
  };
}

const publicUser = (secret: string, u: PanelUser) => ({
  user_key: userKey(secret, u.id),
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
  cases_assigned: u.cases_assigned,
  created_at: u.created_at,
  last_sign_in_at: u.last_sign_in_at,
});

export async function handleLawyers(req: AccessRequest, deps: AccessDeps): Promise<AccessResult> {
  const done = withLog(req, deps);
  const a = await authenticate(req, deps);
  if (a) return done(a, null, null);
  try { lawyersBodySchema.parse(JSON.parse(req.rawBody || "{}")); } catch { return done(err(400, "bad_request"), "lawyers", null); }
  try {
    const users = (await deps.listPanelUsers()).map((u) => publicUser(deps.secret!, u));
    return done({ status: 200, body: { users, generated_at: deps.now().toISOString() } }, "lawyers", users.length);
  } catch {
    return done(err(500, "internal_error"), "lawyers", null);
  }
}

export async function handleVerify(req: AccessRequest, deps: AccessDeps): Promise<AccessResult> {
  const done = withLog(req, deps);
  const a = await authenticate(req, deps);
  if (a) return done(a, null, null);
  let body: z.infer<typeof verifyBodySchema>;
  try { body = verifyBodySchema.parse(JSON.parse(req.rawBody)); } catch { return done(err(400, "bad_request"), "verify", null); }

  const started = deps.now().getTime();
  const pad = async (r: AccessResult) => {
    const wait = MIN_VERIFY_MS - (deps.now().getTime() - started);
    if (wait > 0) await deps.sleep(wait);
    return done(r, "verify", null);
  };
  const eh = emailHash(deps.secret!, body.email);
  try {
    const [perEmail, total] = await Promise.all([
      deps.countAttempts({ emailHash: eh, sinceMs: EMAIL_WINDOW_MS }),
      deps.countAttempts({ sinceMs: 60e3 }),
    ]);
    if (perEmail >= EMAIL_LIMIT || total >= GLOBAL_LIMIT) {
      await deps.recordAttempt(eh, "rate_limited");
      return pad(err(429, "too_many_attempts"));
    }
    const id = await deps.checkPassword(body.email, body.password);
    const user = id ? await deps.findPanelUser(id) : null;
    if (!user || !user.active) {
      await deps.recordAttempt(eh, "invalid");
      return pad({ status: 200, body: { valid: false } });
    }
    await deps.recordAttempt(eh, "valid");
    return pad({ status: 200, body: { valid: true, user_key: userKey(deps.secret!, user.id), name: user.name, email: user.email, role: user.role } });
  } catch {
    return pad(err(500, "internal_error"));
  }
}
