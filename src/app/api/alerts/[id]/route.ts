import { alertPatchSchema } from "@/features/alerts/schemas/alertSchema";
import { deleteAlert, MockPersistenceError, updateAlert } from "@/features/alerts/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = alertPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid patch", issues: parsed.error.issues }, { status: 422 });
  }
  try {
    const updated = await updateAlert(id, parsed.data);
    if (!updated) return Response.json({ error: "Alert not found" }, { status: 404 });
    return Response.json(updated);
  } catch (err) {
    if (err instanceof MockPersistenceError)
      return Response.json({ error: err.message }, { status: 500 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteAlert(id);
  return ok
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Alert not found" }, { status: 404 });
}
