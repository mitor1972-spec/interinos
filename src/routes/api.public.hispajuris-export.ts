import { createFileRoute } from "@tanstack/react-router";
import {
  EXPORT_PATH,
  handleExport,
  type CaseRow,
  type SummaryRow,
} from "@/lib/hispajurisExport.core";

const BASE_URL = "https://interinos.asesor.legal";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function run(request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rawBody = request.method === "POST" ? await request.text() : "";
  const res = await handleExport(
    { method: request.method, path: EXPORT_PATH, headers: request.headers, rawBody },
    {
      keyId: process.env["HISPAJURIS_EXPORT_KEY_ID"],
      secret: process.env["HISPAJURIS_EXPORT_SECRET"],
      baseUrl: BASE_URL,
      now: () => new Date(),
      insertNonce: async (nonce, key_id) => {
        const { error } = await supabaseAdmin.from("export_nonces").insert({ nonce, key_id });
        if (!error) return "ok";
        if (error.code === "23505") return "duplicate";
        throw new Error("nonce_store_failed");
      },
      cleanupNonces: async () => {
        await supabaseAdmin
          .from("export_nonces")
          .delete()
          .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
      },
      log: async (e) => {
        await supabaseAdmin.from("export_log").insert(e);
      },
      fetchSummaryRows: async () => {
        const out: SummaryRow[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabaseAdmin
            .from("leads_interinos")
            .select(
              "created_at, estado, semaforo, resultado_viabilidad, provincia, asignado_a, resultado_contacto, encargo_firmado, pago_completado, cobro_realizado",
            )
            .order("created_at", { ascending: true })
            .range(from, from + 999);
          if (error) throw error;
          out.push(...((data ?? []) as SummaryRow[]));
          if (!data || data.length < 1000) break;
        }
        return out;
      },
      fetchCases: async ({ limit, before, since }) => {
        let q = supabaseAdmin
          .from("leads_interinos")
          .select(
            "id, created_at, estado, semaforo, resultado_viabilidad, provincia, tipo_reclamacion, area_sector, tipo_relacion, asignado_a",
          )
          .order("created_at", { ascending: false })
          .limit(limit);
        if (before) q = q.lt("created_at", before);
        if (since) q = q.gte("created_at", since);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []) as CaseRow[];
      },
    },
  );
  return json(res.status, res.body);
}

export const Route = createFileRoute("/api/public/hispajuris-export")({
  server: {
    handlers: {
      POST: ({ request }) => run(request),
      GET: ({ request }) => run(request),
      PUT: ({ request }) => run(request),
      DELETE: ({ request }) => run(request),
      OPTIONS: ({ request }) => run(request),
    },
  },
});
