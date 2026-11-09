import { TodoBoard } from "@/components/todo-board";
import type { TodoItem } from "@/components/todo-editor";
import { canSeeTodo, isRole } from "@/lib/access";
import { householdTodoUrl } from "@/lib/origin";
import { currentUser } from "@/lib/session";
import { getSettings, listTodoNotes, listTodos, listUsers } from "@/lib/store";
import { dateKey } from "@/lib/time";
import { isTodoStatus } from "@/lib/todos";

export const metadata = { title: "To-dos" };

export default async function TodosPage() {
  const user = await currentUser();
  if (!user || !isRole(user.role)) return null;
  const settings = getSettings();
  const today = dateKey(new Date(), settings.timezone);
  const names = new Map(listUsers().map((person) => [person.id, person.name]));
  const notes = listTodoNotes();
  const todos: TodoItem[] = listTodos().flatMap((todo) => {
    if (!isTodoStatus(todo.status) || !canSeeTodo(user.role, todo, user.id)) return [];
    return [
      {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueDate: todo.dueDate,
        status: todo.status,
        createdBy: todo.createdBy,
        authorName: todo.createdBy ? (names.get(todo.createdBy) ?? "Removed") : "",
        notes: notes
          .filter((note) => note.todoId === todo.id)
          .map((note) => ({
            id: note.id,
            body: note.body,
            authorName: note.userId ? (names.get(note.userId) ?? "Removed") : "Removed",
            createdAt: note.createdAt,
          })),
      },
    ];
  });
  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">To-dos</h1>
      <p className="mt-3 max-w-xl text-muted">
        {user.role === "owner"
          ? "Open items stay on the slip past their due date. Pending items wait until you approve them. Each approved one prints as its own card after the next morning slip, unless you print it when you add it."
          : "Add a to-do here. It stays pending until the owner approves it, then it can print on the morning slip."}
      </p>
      {user.role === "owner" ? <p className="mt-3 break-all font-mono text-sm text-muted">{householdTodoUrl()}</p> : null}
      <TodoBoard todos={todos} today={today} role={user.role} userId={user.id} canPrint={Boolean(settings.printerHost)} />
    </>
  );
}
