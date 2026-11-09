"use client";

import { useState } from "react";

export function SetupForm({ timeZones, defaultZone }: { timeZones: string[]; defaultZone: string }) {
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
        const response = await fetch("/api/setup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: data.get("name"),
            username: data.get("username"),
            password: data.get("password"),
            confirm: data.get("confirm"),
            timezone: data.get("timezone"),
            units: data.get("units"),
          }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(body.error || "Could not finish setup.");
          setPending(false);
          return;
        }
        window.location.href = "/";
      }}
    >
      <label className="field">
        <span>Name</span>
        <input name="name" autoComplete="name" maxLength={40} required />
      </label>
      <label className="field">
        <span>Username</span>
        <input name="username" autoComplete="username" minLength={2} maxLength={32} required />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="field">
        <span>Timezone</span>
        <select name="timezone" defaultValue={defaultZone}>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex gap-6">
        <legend className="field-label mb-2">Temperature</legend>
        <label className="check">
          <input type="radio" name="units" value="f" defaultChecked />
          Fahrenheit
        </label>
        <label className="check">
          <input type="radio" name="units" value="c" />
          Celsius
        </label>
      </fieldset>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-stamp" type="submit" disabled={pending}>
        {pending ? "Saving" : "Create owner"}
      </button>
    </form>
  );
}
