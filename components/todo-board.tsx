"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/access";
import { BOARD_STATUSES, TODO_STATUS_LABELS, type TodoStatus } from "@/lib/todos";
import { TodoEditor, type TodoItem } from "./todo-editor";

const HINTS: Record<TodoStatus, string> = {
  pending: "Waiting for approval",
  new: "On the next slip",
  in_progress: "Started",
  done: "Off the slip",
};

export function TodoBoard({
  todos,
  today,
  role,
  userId,
  canPrint,
}: {
  todos: TodoItem[];
  today: string;
  role: Role;
  userId: number;
  canPrint: boolean;
}) {
  const router = useRouter();
  const [column, setColumn] = useState<TodoStatus>(todos.some((todo) => todo.status === "pending") ? "pending" : "new");
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const selected = todos.find((todo) => todo.id === openId) ?? null;

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  async function addTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError("");
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        description: data.get("description"),
        dueDate: data.get("dueDate"),
        printCard: data.get("printCard") === "on",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; printError?: string; status?: TodoStatus };
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "Could not add that to-do.");
      return;
    }
    if (payload.printError) setError(payload.printError);
    if (payload.status) setColumn(payload.status);
    form.reset();
    router.refresh();
  }

  return (
    <div className="mt-8">
      <section className="max-w-xl">
        <h2 className="font-serif text-2xl">Add one</h2>
        <form className="mt-4 flex flex-col gap-5" onSubmit={addTodo}>
          <label className="field">
            <span>Title</span>
            <input name="title" maxLength={140} required placeholder="Call the dentist" />
          </label>
          <label className="field">
            <span>Short description</span>
            <textarea name="description" maxLength={200} placeholder="Ask about the crown" />
          </label>
          <label className="field">
            <span>Due</span>
            <input name="dueDate" type="date" required defaultValue={today} />
          </label>
          {role === "owner" ? (
            <>
              <label className="check">
                <input name="printCard" type="checkbox" disabled={!canPrint || pending} />
                <span>Print a card now</span>
              </label>
              <p className="text-sm text-muted">
                {canPrint
                  ? "Leave this off and the card prints after the next morning slip."
                  : "Add a printer to print a card now. Otherwise it waits for the next morning slip."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">This stays pending until the owner approves it.</p>
          )}
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-stamp w-fit" type="submit" disabled={pending}>
            Add to-do
          </button>
        </form>
      </section>
      <div className="mt-10 flex gap-2 overflow-x-auto md:hidden" role="tablist" aria-label="To-do columns">
        {BOARD_STATUSES.map((status) => (
          <button
            key={status}
            className={column === status ? "btn bg-ink text-paper" : "btn btn-quiet"}
            type="button"
            role="tab"
            aria-selected={column === status}
            onClick={() => setColumn(status)}
          >
            {TODO_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      <div className="mt-4 md:hidden">
        <Column status={column} todos={todos.filter((todo) => todo.status === column)} today={today} onOpen={setOpenId} />
      </div>
      <div className="mt-10 hidden gap-4 md:grid md:grid-cols-4">
        {BOARD_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            todos={todos.filter((todo) => todo.status === status)}
            today={today}
            onOpen={setOpenId}
          />
        ))}
      </div>
      {selected ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 md:items-center md:p-6" onMouseDown={() => setOpenId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="todo-card-title"
            className="max-h-[100dvh] w-full overflow-y-auto bg-paper px-5 py-6 shadow-xl md:max-h-[90vh] md:max-w-lg md:border md:border-ink/15"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <TodoEditor
              key={`${selected.id}:${selected.status}:${selected.title}:${selected.description}:${selected.dueDate}:${selected.notes.length}`}
              todo={selected}
              today={today}
              role={role}
              userId={userId}
              canPrint={canPrint}
              onClose={() => setOpenId(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Column({
  status,
  todos,
  today,
  onOpen,
}: {
  status: TodoStatus;
  todos: TodoItem[];
  today: string;
  onOpen: (id: number) => void;
}) {
  return (
    <section className="border border-ink/10 bg-paper/70 p-3" aria-label={TODO_STATUS_LABELS[status]}>
      <h2 className="font-serif text-2xl">{TODO_STATUS_LABELS[status]}</h2>
      <p className="text-sm text-muted">{HINTS[status]}</p>
      {todos.length === 0 ? <p className="mt-4 text-sm text-muted">None</p> : null}
      <ul className="mt-3 flex flex-col gap-3">
        {todos.map((todo) => {
          const overdue = todo.status !== "done" && todo.dueDate < today;
          return (
            <li key={todo.id}>
              <button type="button" className="w-full border border-ink/15 bg-paper px-3 py-3 text-left" onClick={() => onOpen(todo.id)}>
                <span className="block font-serif text-xl leading-tight">{todo.title}</span>
                {todo.description ? <span className="mt-1 block text-sm text-muted">{todo.description}</span> : null}
                {todo.authorName ? <span className="mt-1 block text-sm text-muted">{todo.authorName}</span> : null}
                <span className={overdue ? "mt-2 block text-sm text-stamp" : "mt-2 block text-sm text-muted"}>
                  {overdue ? "Overdue · " : ""}
                  {todo.dueDate}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
