"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/access";
import { TODO_STATUS_LABELS, type TodoStatus } from "@/lib/todos";

export type TodoNoteItem = {
  id: number;
  body: string;
  authorName: string;
  createdAt: number;
};

export type TodoItem = {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: TodoStatus;
  createdBy: number | null;
  authorName: string;
  notes: TodoNoteItem[];
};

const OFFICIAL: TodoStatus[] = ["new", "in_progress", "done"];

export function TodoEditor({
  todo,
  today,
  role,
  userId,
  canPrint,
  onClose,
}: {
  todo: TodoItem;
  today: string;
  role: Role;
  userId: number;
  canPrint: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const canEdit = role === "owner" || (todo.createdBy === userId && todo.status === "pending");
  const overdue = todo.status !== "done" && todo.dueDate < today;

  async function send(url: string, method: string, body?: unknown) {
    setPending(true);
    setError("");
    const response = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; printError?: string };
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "Could not update that to-do.");
      return false;
    }
    if (payload.printError) setError(payload.printError);
    router.refresh();
    return true;
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.14em] text-muted">To-do</p>
      <h2 id="todo-card-title" className="mt-2 font-serif text-3xl leading-tight tracking-tight">
        {todo.title}
      </h2>
      {todo.authorName ? <p className="mt-2 text-sm text-muted">Added by {todo.authorName}</p> : null}
      {todo.status === "pending" ? <p className="mt-2 text-stamp">Waiting for approval</p> : null}
      <form
        className="mt-4 flex flex-col gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await send(`/api/todos/${todo.id}`, "PATCH", {
            title: data.get("title"),
            description: data.get("description"),
            dueDate: data.get("dueDate"),
          });
        }}
      >
        <label className="field">
          <span>Title</span>
          <input name="title" defaultValue={todo.title} maxLength={140} required disabled={!canEdit || pending} />
        </label>
        <label className="field">
          <span>Short description</span>
          <textarea name="description" defaultValue={todo.description} maxLength={200} disabled={!canEdit || pending} />
        </label>
        <p className="text-sm text-muted">The card prints the title, this description, and the due date.</p>
        <label className="field">
          <span>Due</span>
          <input name="dueDate" type="date" defaultValue={todo.dueDate} required disabled={!canEdit || pending} />
        </label>
        {overdue ? <p className="text-sm text-stamp">Overdue</p> : null}
        {canEdit ? (
          <button className="btn btn-stamp w-fit" type="submit" disabled={pending}>
            Save
          </button>
        ) : (
          <p className="text-sm text-muted">The owner can change this to-do. You can still add a note.</p>
        )}
      </form>
      {role === "owner" ? (
        <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label="Status">
          {OFFICIAL.map((status) => {
            const selected = todo.status === status;
            const label = status === "new" && todo.status === "pending" ? "Approve" : TODO_STATUS_LABELS[status];
            return (
              <button
                key={status}
                className={selected ? "btn bg-ink text-paper" : "btn btn-quiet"}
                type="button"
                aria-pressed={selected}
                disabled={pending || selected}
                onClick={() => {
                  void send(`/api/todos/${todo.id}`, "PATCH", { status });
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      <section className="mt-8">
        <h2 className="font-serif text-2xl">Notes</h2>
        {todo.notes.length === 0 ? <p className="mt-2 text-sm text-muted">No notes yet.</p> : null}
        <ul className="mt-3 flex flex-col gap-4">
          {todo.notes.map((note) => (
            <li key={note.id}>
              <p className="text-sm text-muted">
                {note.authorName} · {formatWhen(note.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const saved = await send(`/api/todos/${todo.id}/notes`, "POST", { body: new FormData(form).get("body") });
            if (saved) form.reset();
          }}
        >
          <label className="field">
            <span>Add a note</span>
            <textarea name="body" maxLength={1000} required disabled={pending} />
          </label>
          <button className="btn btn-quiet w-fit" type="submit" disabled={pending}>
            Add note
          </button>
        </form>
      </section>
      {error ? (
        <p className="error mt-4" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-x-5">
        {role === "owner" && canPrint && todo.status !== "pending" && todo.status !== "done" ? (
          <button
            className="btn-text text-sm"
            type="button"
            disabled={pending}
            onClick={() => {
              void send(`/api/todos/${todo.id}/print`, "POST");
            }}
          >
            Print card
          </button>
        ) : null}
        {canEdit ? (
          <button
            className="btn-text text-sm"
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Remove this to-do?")) return;
              void send(`/api/todos/${todo.id}`, "DELETE").then((saved) => {
                if (!saved) return;
                if (onClose) onClose();
                else router.push("/todos");
              });
            }}
          >
            Remove
          </button>
        ) : null}
        {onClose ? (
          <button className="btn-text text-sm" type="button" onClick={onClose}>
            Close
          </button>
        ) : (
          <Link href="/todos" className="btn-text text-sm">
            All to-dos
          </Link>
        )}
      </div>
    </div>
  );
}

function formatWhen(value: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}
