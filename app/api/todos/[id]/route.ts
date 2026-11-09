import { isRole, memberCanEditTodo } from "@/lib/access";
import { errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { deleteTodo, getTodo, updateTodo } from "@/lib/store";
import { parseTodoPatch } from "@/lib/validate";

async function idFrom(context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError("That to-do was not found.", 404);
  return id;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user || !isRole(user.role)) return Response.json({ error: "Sign in required." }, { status: 401 });
    const id = await idFrom(context);
    const todo = getTodo(id);
    if (!todo) throw new HttpError("That to-do was not found.", 404);
    if (user.role === "member" && !memberCanEditTodo(todo, user.id)) {
      throw new HttpError("That to-do can no longer be changed.", 403);
    }
    const patch = parseTodoPatch(asRecord(await readJson(request)));
    if (user.role === "member" && patch.status) throw new HttpError("Only the owner can change status.", 403);
    updateTodo(id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user || !isRole(user.role)) return Response.json({ error: "Sign in required." }, { status: 401 });
    const id = await idFrom(context);
    const todo = getTodo(id);
    if (!todo) throw new HttpError("That to-do was not found.", 404);
    if (user.role === "member" && !memberCanEditTodo(todo, user.id)) {
      throw new HttpError("That to-do can no longer be changed.", 403);
    }
    deleteTodo(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
