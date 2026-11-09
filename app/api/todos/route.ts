import { initialTodoStatus, isRole } from "@/lib/access";
import { errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { printTodoCard } from "@/lib/print-job";
import { currentUser } from "@/lib/session";
import { insertTodo } from "@/lib/store";
import { parseTodo } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user || !isRole(user.role)) return Response.json({ error: "Sign in required." }, { status: 401 });
    const parsed = parseTodo(asRecord(await readJson(request)));
    const status = initialTodoStatus(user.role);
    const id = insertTodo({
      title: parsed.title,
      description: parsed.description,
      dueDate: parsed.dueDate,
      status,
      createdBy: user.id,
    });
    if (user.role !== "owner" || !parsed.printCard) return Response.json({ ok: true, id, status });
    try {
      await printTodoCard(id);
    } catch (error) {
      const message = error instanceof HttpError ? error.message : "The card did not print.";
      return Response.json({ ok: true, id, status, printError: `${message} It will print with the next roundup.` });
    }
    return Response.json({ ok: true, id, status });
  } catch (error) {
    return errorResponse(error);
  }
}
