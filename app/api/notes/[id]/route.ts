import { assertOwner, errorResponse } from "@/lib/api";
import { HttpError } from "@/lib/http";
import { dismissNote } from "@/lib/store";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError("That note was not found.", 404);
    dismissNote(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
