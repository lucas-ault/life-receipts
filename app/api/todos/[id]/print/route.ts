import { assertOwner, errorResponse } from "@/lib/api";
import { HttpError } from "@/lib/http";
import { printTodoCard } from "@/lib/print-job";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError("That to-do was not found.", 404);
    await printTodoCard(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
