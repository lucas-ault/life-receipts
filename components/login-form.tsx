"use client";

import { useState } from "react";
import { memberMayOpen } from "@/lib/access";

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 flex flex-col gap-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const data = new FormData(event.currentTarget);
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string; role?: string };
        if (!response.ok) {
          setError(body.error || "Could not sign in.");
          setPending(false);
          return;
        }
        const next = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
        window.location.href = body.role === "member" && !memberMayOpen(next) ? "/todos" : next;
      }}
    >
      <label className="field">
        <span>Username</span>
        <input name="username" autoComplete="username" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-stamp" type="submit" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
