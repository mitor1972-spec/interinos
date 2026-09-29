import { opaqueRef } from "./hispajurisExport.core";
import type { UpdateDeps, LeadRow } from "./hispajurisCase.core";

export async function buildDeps(): Promise<UpdateDeps> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const secret = process.env["HISPAJURIS_EXPORT_SECRET"];
  return {
    keyId: process.env["HISPAJURIS_EXPORT_KEY_ID"],
    secret,
    now: () => new Date(),
    insertNonce: async (nonce, key_id) => {
      const { error } = await db.from("export_nonces").insert({ nonce, key_id });
      if (!error) return "ok";
      if (error.code === "23505") return "duplicate";
      throw new Error("nonce_store_failed");
    },
    cleanupNonces: async () => {
      await db.from("export_nonces").delete().lt("created_at", new Date(Date.now() - 600e3).toISOString());
    },
    recentCalls: async (key) => {
      const { count } = await db.from("export_log").select("id", { count: "exact", head: true })
        .eq("key_id", key).in("action", ["case", "case_update"]).gte("created_at", new Date(Date.now() - 60e3).toISOString());
      return count ?? 0;
    },
    log: async (e) => { await db.from("export_log").insert(e); },
    findLead: async (key) => {
      const { data, error } = await db.from("leads_interinos").select("id");
      if (error) throw error;
      const hit = (data ?? []).find((r: { id: string }) => opaqueRef(secret!, r.id) === key);
      if (!hit) return null;
      const { data: lead } = await db.from("leads_interinos").select("*").eq("id", hit.id).single();
      return (lead as LeadRow) ?? null;
    },
    loadExtras: async (lead) => {
      const [docs, hist, abo] = await Promise.all([
        db.from("lead_documentos").select("nombre_original, categoria, created_at, estado").eq("lead_id", lead.id).order("created_at", { ascending: false }),
        db.from("lead_historial").select("created_at, campo, valor_anterior, valor_nuevo, usuario_email, origen").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(200),
        lead.asignado_a ? db.from("abogados").select("nombre, email").eq("user_id", lead.asignado_a).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { documents: docs.data ?? [], historial: hist.data ?? [], verticalUser: abo.data ?? null };
    },
    addHistory: async (leadId, entries) => {
      if (!entries.length) return;
      const { error } = await db.from("lead_historial").insert(entries.map((e) => ({ ...e, lead_id: leadId, origen: "portal", usuario_email: e.usuario_email ?? "portal.hispajuris" })));
      if (error) throw error;
    },
    claimRequest: async (request_id, lead_id) => {
      const { error } = await db.from("portal_requests").insert({ request_id, lead_id });
      if (!error) return "ok";
      if (error.code === "23505") return "duplicate";
      throw error;
    },
    releaseRequest: async (id) => { await db.from("portal_requests").delete().eq("request_id", id); },
    findLawyerUserId: async (email) => {
      const { data } = await db.from("abogados").select("user_id").ilike("email", email).eq("activo", true).not("user_id", "is", null).limit(1);
      return data?.[0]?.user_id ?? null;
    },
    patchLead: async (id, patch) => {
      const { data, error } = await db.from("leads_interinos").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as LeadRow;
    },
  };
}

export const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
