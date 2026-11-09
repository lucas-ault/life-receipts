import { assertOwner, errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { deleteUser, getUser, getUserByUsername, updateUser } from "@/lib/store";
import { parseDisplayName, parseUsername } from "@/lib/validate";

async function idFrom(context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError("That person was not found.", 404);
  return id;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = await idFrom(context);
    const user = getUser(id);
    if (!user) throw new HttpError("That person was not found.", 404);
    const body = asRecord(await readJson(request));
    const name = parseDisplayName(body.name);
    const username = parseUsername(body.username);
    const taken = getUserByUsername(username);
    if (taken && taken.id !== id) throw new HttpError("That username is taken.");
    updateUser(id, { name, username });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = await idFrom(context);
    const user = getUser(id);
    const actor = await currentUser();
    if (!user || !actor) throw new HttpError("That person was not found.", 404);
    if (user.role === "owner" || user.id === actor.id) throw new HttpError("The owner account stays.");
    deleteUser(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
