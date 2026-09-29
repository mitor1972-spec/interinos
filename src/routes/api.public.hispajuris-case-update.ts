import { createFileRoute } from "@tanstack/react-router";
import { CASE_UPDATE_PATH, handleCaseUpdate } from "@/lib/hispajurisCase.core";

async function run(request: Request) {
  const { buildDeps, jsonRes } = await import("@/lib/hispajurisCase.server");
  const rawBody = request.method === "POST" ? await request.text() : "";
  const res = await handleCaseUpdate({ method: request.method, path: CASE_UPDATE_PATH, headers: request.headers, rawBody }, await buildDeps());
  return jsonRes(res.status, res.body);
}

export const Route = createFileRoute("/api/public/hispajuris-case-update")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
