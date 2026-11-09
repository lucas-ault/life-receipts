"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = {
  id: number;
  name: string;
  username: string;
  role: "owner" | "member";
};

export function UserManager({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);

  async function send(url: string, method: string, body?: unknown) {
    setPending(true);
    setError("");
    const response = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; username?: string; password?: string };
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "Could not update that account.");
      return null;
    }
    router.refresh();
    return payload;
  }

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <section>
        <h2 className="font-serif text-2xl">Add a person</h2>
        <p className="mt-2 text-sm text-muted">They can add notes and to-dos. You set or generate the password and share it once.</p>
        <form
          className="mt-4 flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const generate = data.get("generate") === "on";
            const payload = await send("/api/users", "POST", {
              name: data.get("name"),
              username: data.get("username"),
              password: data.get("password"),
              generate,
            });
            if (payload) {
              if (payload.username && payload.password) setIssued({ username: payload.username, password: payload.password });
              form.reset();
            }
          }}
        >
          <label className="field">
            <span>Name</span>
            <input name="name" maxLength={40} required />
          </label>
          <label className="field">
            <span>Username</span>
            <input name="username" minLength={2} maxLength={32} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="text" autoComplete="off" />
          </label>
          <label className="check">
            <input name="generate" type="checkbox" />
            <span>Generate a password</span>
          </label>
          <button className="btn btn-stamp w-fit" type="submit" disabled={pending}>
            Add person
          </button>
        </form>
        {issued ? (
          <p className="mt-4 border border-ink/15 bg-paper px-3 py-3 text-sm" role="status">
            Password for <span className="font-mono">{issued.username}</span>: <span className="font-mono">{issued.password}</span>. Copy it now. It
            will not be shown again.
          </p>
        ) : null}
        {error ? (
          <p className="error mt-4" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <section>
        <h2 className="font-serif text-2xl">People</h2>
        <ul className="mt-4 divide-y divide-ink/15 border-t border-ink/15">
          {people.map((person) => (
            <li key={person.id} className="py-5">
              <p className="text-sm uppercase tracking-[0.14em] text-muted">{person.role === "owner" ? "Owner" : "Can add notes and to-dos"}</p>
              <form
                className="mt-3 grid gap-4 sm:grid-cols-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  await send(`/api/users/${person.id}`, "PATCH", { name: data.get("name"), username: data.get("username") });
                }}
              >
                <label className="field">
                  <span>Name</span>
                  <input name="name" defaultValue={person.name} maxLength={40} required />
                </label>
                <label className="field">
                  <span>Username</span>
                  <input name="username" defaultValue={person.username} minLength={2} maxLength={32} required />
                </label>
                <button className="btn btn-quiet w-fit" type="submit" disabled={pending}>
                  Save
                </button>
              </form>
              <form
                className="mt-4 flex flex-wrap items-end gap-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const generate = data.get("generate") === "on";
                  const payload = await send(`/api/users/${person.id}/password`, "POST", {
                    password: data.get("password"),
                    generate,
                  });
                  if (payload?.password) {
                    setIssued({ username: person.username, password: payload.password });
                    form.reset();
                  }
                }}
              >
                <label className="field min-w-40 flex-1">
                  <span>New password</span>
                  <input name="password" type="text" autoComplete="off" />
                </label>
                <label className="check mb-3">
                  <input name="generate" type="checkbox" />
                  <span>Generate</span>
                </label>
                <button className="btn btn-quiet" type="submit" disabled={pending}>
                  Set password
                </button>
              </form>
              {person.role === "member" ? (
                <button
                  className="btn-text mt-3 text-sm"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Remove ${person.name}?`)) return;
                    void send(`/api/users/${person.id}`, "DELETE");
                  }}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
