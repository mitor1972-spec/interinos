import { createClient } from "@supabase/supabase-js";
import type { AccessDeps, PanelUser } from "./hispajurisAccess.core";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function buildAccessDeps(): Promise<AccessDeps> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  const listPanelUsers = async (onlyId?: string): Promise<PanelUser[]> => {
    let rq = db.from("user_roles").select("user_id, role").in("role", ["lawyer", "admin"]);
    if (onlyId) rq = rq.eq("user_id", onlyId);
    const { data: roles, error } = await rq;
    if (error) throw error;
    const byUser = new Map<string, "lawyer" | "admin">();
    for (const r of roles ?? []) if (byUser.get(r.user_id) !== "admin") byUser.set(r.user_id, r.role);
    const ids = [...byUser.keys()];
    if (!ids.length) return [];
    const [abo, leads] = await Promise.all([
      db.from("abogados").select("user_id, nombre, activo").in("user_id", ids),
      db.from("leads_interinos").select("asignado_a").in("asignado_a", ids).eq("is_demo", false),
    ]);
    const counts = new Map<string, number>();
    for (const l of leads.data ?? []) counts.set(l.asignado_a, (counts.get(l.asignado_a) ?? 0) + 1);
    const out: PanelUser[] = [];
    for (const id of ids) {
      const { data: u } = await db.auth.admin.getUserById(id);
      const user = u?.user;
      if (!user?.email) continue;
      const a = (abo.data ?? []).find((x: any) => x.user_id === id);
      const banned = user.banned_until && Date.parse(user.banned_until) > Date.now();
      out.push({
        id,
        name: a?.nombre ?? (user.user_metadata?.nombre as string) ?? null,
        email: user.email,
        role: byUser.get(id)!,
        active: !banned && (a ? !!a.activo : true),
        cases_assigned: counts.get(id) ?? 0,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
      });
    }
    return out;
  };

  return {
    keyId: process.env["HISPAJURIS_EXPORT_KEY_ID"],
    secret: process.env["HISPAJURIS_EXPORT_SECRET"],
    now: () => new Date(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    insertNonce: async (nonce, key_id) => {
      await db.from("export_nonces").delete().lt("created_at", new Date(Date.now() - 600e3).toISOString());
      const { error } = await db.from("export_nonces").insert({ nonce, key_id });
      if (!error) return "ok";
      if (error.code === "23505") return "duplicate";
      throw new Error("nonce_store_failed");
    },
    log: async (e) => { await db.from("export_log").insert(e); },
    listPanelUsers: () => listPanelUsers(),
    findPanelUser: async (id) => (await listPanelUsers(id))[0] ?? null,
    countAttempts: async ({ emailHash, sinceMs }) => {
      let q = db.from("portal_auth_attempts").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - sinceMs).toISOString());
      if (emailHash) q = q.eq("email_hash", emailHash);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    recordAttempt: async (email_hash, outcome) => { await db.from("portal_auth_attempts").insert({ email_hash, outcome }); },
    checkPassword: async (email, password) => {
      // Cliente aislado, sin guardar sesión; la sesión creada se revoca al instante.
      const c = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await c.auth.signInWithPassword({ email, password });
      if (error || !data.user || !data.session) return null;
      await db.auth.admin.signOut(data.session.access_token, "local").catch(() => undefined);
      return data.user.id;
    },
  };
}
