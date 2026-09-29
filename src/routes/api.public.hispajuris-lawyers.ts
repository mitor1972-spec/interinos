import { createFileRoute } from "@tanstack/react-router";
import { LAWYERS_PATH, handleLawyers } from "@/lib/hispajurisAccess.core";

async function run(request: Request) {
  const { buildAccessDeps } = await import("@/lib/hispajurisAccess.server");
  const { jsonRes } = await import("@/lib/hispajurisCase.server");
  const rawBody = request.method === "POST" ? await request.text() : "";
  const res = await handleLawyers({ method: request.method, path: LAWYERS_PATH, headers: request.headers, rawBody }, await buildAccessDeps());
  return jsonRes(res.status, res.body);
}

export const Route = createFileRoute("/api/public/hispajuris-lawyers")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
