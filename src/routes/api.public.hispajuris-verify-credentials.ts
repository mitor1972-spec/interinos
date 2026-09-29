import { createFileRoute } from "@tanstack/react-router";
import { VERIFY_PATH, handleVerify } from "@/lib/hispajurisAccess.core";

async function run(request: Request) {
  const { buildAccessDeps } = await import("@/lib/hispajurisAccess.server");
  const { jsonRes } = await import("@/lib/hispajurisCase.server");
  const rawBody = request.method === "POST" ? await request.text() : "";
  const res = await handleVerify({ method: request.method, path: VERIFY_PATH, headers: request.headers, rawBody }, await buildAccessDeps());
  return jsonRes(res.status, res.body);
}

export const Route = createFileRoute("/api/public/hispajuris-verify-credentials")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
