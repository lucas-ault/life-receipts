"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PrintButton({
  disabled,
  endpoint = "/api/print",
  label = "Print now",
}: {
  disabled?: boolean;
  endpoint?: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="mt-6">
      <button
        className="btn btn-stamp w-full md:w-auto"
        type="button"
        disabled={disabled || pending}
        onClick={async () => {
          setPending(true);
          setError("");
          setDone(false);
          const response = await fetch(endpoint, { method: "POST" });
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setPending(false);
          if (!response.ok) {
            setError(body.error || "The print failed.");
            return;
          }
          setDone(true);
          router.refresh();
        }}
      >
        {pending ? "Printing" : label}
      </button>
      {error ? (
        <p className="error mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {done ? <p className="mt-3 text-sm text-muted">Sent to the printer.</p> : null}
    </div>
  );
}
