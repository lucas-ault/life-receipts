"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CalendarChoice = { id: string; name: string; primary: boolean };

export function CalendarManager({
  configured,
  connected,
  redirectUri,
  calendars,
  selectedId,
  loadError,
}: {
  configured: boolean;
  connected: boolean;
  redirectUri: string;
  calendars: CalendarChoice[];
  selectedId: string | null;
  loadError: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(selectedId ?? calendars[0]?.id ?? "");
  const [error, setError] = useState(loadError);
  const [pending, setPending] = useState(false);

  if (!configured) {
    return (
      <div className="mt-6 max-w-xl text-muted">
        <p>Calendar stays empty until Google sign-in is configured.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>Create an OAuth client in Google Cloud.</li>
          <li>Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL.</li>
          <li>Add this redirect URI, then restart the app: {redirectUri || "APP_URL/api/calendar/callback"}</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-xl">
      {connected ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const calendar = calendars.find((item) => item.id === choice);
            if (!calendar) return;
            setPending(true);
            setError("");
            const response = await fetch("/api/calendar", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ calendarId: calendar.id, calendarName: calendar.name }),
            });
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            setPending(false);
            if (!response.ok) {
              setError(payload.error || "Could not save the calendar.");
              return;
            }
            router.refresh();
          }}
        >
          <fieldset className="flex flex-col">
            <legend className="field-label">Calendar for today</legend>
            {calendars.length === 0 ? <p className="mt-3 text-muted">No calendars came back.</p> : null}
            {calendars.map((calendar) => (
              <label key={calendar.id} className="check border-b border-ink/10">
                <input
                  type="radio"
                  name="calendar"
                  value={calendar.id}
                  checked={choice === calendar.id}
                  onChange={() => setChoice(calendar.id)}
                />
                <span>
                  {calendar.name}
                  {calendar.primary ? <span className="text-muted"> · primary</span> : null}
                </span>
              </label>
            ))}
          </fieldset>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-stamp" type="submit" disabled={pending || !choice}>
              Use this calendar
            </button>
            <button
              className="btn btn-quiet"
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await fetch("/api/calendar/disconnect", { method: "POST" });
                window.location.href = "/calendar";
              }}
            >
              Disconnect
            </button>
          </div>
        </form>
      ) : (
        <a className="btn btn-stamp" href="/api/calendar/connect">
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}
