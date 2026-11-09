"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type NoteItem = {
  id: number;
  author: string | null;
  body: string;
  source: string;
  createdAt: number;
};

export function NoteManager({ notes, shareUrl, canManage }: { notes: NoteItem[]; shareUrl: string; canManage: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section>
        <h2 className="font-serif text-2xl">Write a note</h2>
        <form
          className="mt-4 flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            setPending(true);
            setError("");
            const response = await fetch("/api/notes", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ author: data.get("author"), body: data.get("body") }),
            });
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            setPending(false);
            if (!response.ok) {
              setError(payload.error || "Could not save the note.");
              return;
            }
            form.reset();
            router.refresh();
          }}
        >
          <label className="field">
            <span>Name</span>
            <input name="author" maxLength={40} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Note</span>
            <textarea name="body" maxLength={500} required />
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-stamp w-fit" type="submit" disabled={pending}>
            Add note
          </button>
        </form>
      </section>
      <section>
        {canManage ? (
          <>
        <h2 className="font-serif text-2xl">Shared page</h2>
        <p className="mt-2 text-muted">Anyone with this link can leave a note for the next slip.</p>
        <p className="mt-4 break-all font-mono text-sm">{shareUrl}</p>
        <button
          className="btn-text mt-3 text-sm"
          type="button"
          disabled={pending}
          onClick={async () => {
            if (!window.confirm("Replace the shared link? The old one will stop working.")) return;
            setPending(true);
            const response = await fetch("/api/notes/token", { method: "POST" });
            setPending(false);
            if (!response.ok) {
              setError("Could not replace the link.");
              return;
            }
            router.refresh();
          }}
        >
          New link
        </button>
          </>
        ) : null}
        <h2 className={canManage ? "mt-10 font-serif text-2xl" : "font-serif text-2xl"}>Waiting</h2>
        {notes.length === 0 ? <p className="mt-3 text-muted">Nothing is waiting to print.</p> : null}
        <ul className="mt-4 divide-y divide-ink/15 border-t border-ink/15">
          {notes.map((note) => (
            <li key={note.id} className="py-4">
              {note.author ? <p className="font-serif text-xl">{note.author}</p> : null}
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-sm text-muted">{note.source === "public" ? "From the shared page" : "Added here"}</p>
              {canManage ? (
              <button
                className="btn-text mt-2 text-sm"
                type="button"
                onClick={async () => {
                  const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
                  if (!response.ok) {
                    setError("Could not dismiss that note.");
                    return;
                  }
                  router.refresh();
                }}
              >
                Dismiss
              </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
