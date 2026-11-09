import { notFound } from "next/navigation";
import { TodoEditor, type TodoItem } from "@/components/todo-editor";
import { canSeeTodo, isRole } from "@/lib/access";
import { currentUser } from "@/lib/session";
import { getSettings, getTodo, listTodoNotes, listUsers } from "@/lib/store";
import { dateKey } from "@/lib/time";
import { isTodoStatus } from "@/lib/todos";

export const metadata = { title: "To-do" };

export default async function TodoCardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !isRole(user.role)) return null;
  const id = Number((await params).id);
  const todo = Number.isInteger(id) && id > 0 ? getTodo(id) : undefined;
  if (!todo || !isTodoStatus(todo.status) || !canSeeTodo(user.role, todo, user.id)) notFound();
  const names = new Map(listUsers().map((person) => [person.id, person.name]));
  const item: TodoItem = {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    dueDate: todo.dueDate,
    status: todo.status,
    createdBy: todo.createdBy,
    authorName: todo.createdBy ? (names.get(todo.createdBy) ?? "Removed") : "",
    notes: listTodoNotes(todo.id).map((note) => ({
      id: note.id,
      body: note.body,
      authorName: note.userId ? (names.get(note.userId) ?? "Removed") : "Removed",
      createdAt: note.createdAt,
    })),
  };
  const settings = getSettings();
  return (
    <div className="mx-auto max-w-lg">
      <TodoEditor
        key={`${item.id}:${item.status}:${item.notes.length}`}
        todo={item}
        today={dateKey(new Date(), settings.timezone)}
        role={user.role}
        userId={user.id}
        canPrint={Boolean(settings.printerHost)}
      />
    </div>
  );
}
