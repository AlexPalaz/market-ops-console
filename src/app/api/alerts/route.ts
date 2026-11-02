import { alertInputSchema } from "@/features/alerts/schemas/alertSchema";
import { createAlert, listAlerts, MockPersistenceError } from "@/features/alerts/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listAlerts(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = alertInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid alert", issues: parsed.error.issues }, { status: 422 });
  }
  try {
    return Response.json(await createAlert(parsed.data), { status: 201 });
  } catch (err) {
    if (err instanceof MockPersistenceError)
      return Response.json({ error: err.message }, { status: 500 });
    throw err;
  }
}
