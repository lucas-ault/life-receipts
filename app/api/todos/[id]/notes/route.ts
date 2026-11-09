import { canSeeTodo, isRole } from "@/lib/access";
import { errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { getTodo, insertTodoNote } from "@/lib/store";
import { parseTodoNote } from "@/lib/validate";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user || !isRole(user.role)) return Response.json({ error: "Sign in required." }, { status: 401 });
    const id = Number((await context.params).id);
    const todo = Number.isInteger(id) && id > 0 ? getTodo(id) : undefined;
    if (!todo || !canSeeTodo(user.role, todo, user.id)) throw new HttpError("That to-do was not found.", 404);
    const note = parseTodoNote(asRecord(await readJson(request)));
    insertTodoNote({ todoId: id, userId: user.id, body: note.body });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
