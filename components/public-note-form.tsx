"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublicNoteForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setPending(true);
        setError("");
        setDone(false);
        const response = await fetch("/api/public/notes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, author: data.get("author"), body: data.get("body") }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setPending(false);
        if (!response.ok) {
          setError(payload.error || "Could not leave the note.");
          return;
        }
        form.reset();
        setDone(true);
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
      {done ? <p className="text-sm text-muted">It’s on the list for the morning slip.</p> : null}
      <button className="btn btn-stamp w-fit" type="submit" disabled={pending}>
        Leave note
      </button>
    </form>
  );
}
