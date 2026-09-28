import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Resuelve un ref opaco del portal Hispajuris a un id de caso. Solo administradores. */
export const resolverRefCaso = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ ref: z.string().regex(/^[0-9a-f]{16}$/), token: z.string().min(10).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const secret = process.env["HISPAJURIS_EXPORT_SECRET"];
    if (!secret) return { id: null as string | null };
    const { createClient } = await import("@supabase/supabase-js");
    const { opaqueRef } = await import("./hispajurisExport.core");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.token}` } },
    });
    const { data: u } = await sb.auth.getUser(data.token);
    if (!u.user) return { id: null };
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return { id: null };
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await sb.from("leads_interinos").select("id").range(from, from + 999);
      const hit = (rows ?? []).find((r) => opaqueRef(secret, r.id) === data.ref);
      if (hit) return { id: hit.id };
      if (!rows || rows.length < 1000) break;
    }
    return { id: null };
  });
