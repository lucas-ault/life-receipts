"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PrinterValues = {
  printerHost: string;
  printerPort: number;
  paperWidth: string;
  printTime: string;
  printEnabled: boolean;
  timezone: string;
  units: string;
};

export function PrinterForm({ values, timeZones }: { values: PrinterValues; timeZones: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const test = (event.nativeEvent as SubmitEvent).submitter?.dataset.intent === "test";
    const data = new FormData(event.currentTarget);
    const body = {
      printerHost: data.get("printerHost"),
      printerPort: Number(data.get("printerPort")),
      paperWidth: data.get("paperWidth"),
      printTime: data.get("printTime"),
      printEnabled: data.get("printEnabled") === "on",
      timezone: data.get("timezone"),
      units: data.get("units"),
    };
    setPending(true);
    setError("");
    setMessage("");
    const saved = await fetch("/api/printer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const savedBody = (await saved.json().catch(() => ({}))) as { error?: string };
    if (!saved.ok) {
      setPending(false);
      setError(savedBody.error || "Could not save the printer.");
      return;
    }
    if (!test) {
      setPending(false);
      setMessage("Saved.");
      router.refresh();
      return;
    }
    const printed = await fetch("/api/printer/test", { method: "POST" });
    const printedBody = (await printed.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!printed.ok) {
      setError(printedBody.error || "The test print failed.");
      router.refresh();
      return;
    }
    setMessage("Test slip sent.");
    router.refresh();
  }

  return (
    <form className="mt-8 grid max-w-xl gap-6" onSubmit={(event) => void submit(event)}>
      <label className="field">
        <span>Printer address</span>
        <input name="printerHost" defaultValue={values.printerHost} placeholder="192.168.10.46" autoComplete="off" spellCheck={false} />
      </label>
      <p className="-mt-4 text-sm text-muted">Port 9100 is the usual raw port. This network’s printer is at 192.168.10.46.</p>
      <label className="field">
        <span>Port</span>
        <input name="printerPort" defaultValue={values.printerPort} inputMode="numeric" />
      </label>
      <fieldset>
        <legend className="field-label">Paper</legend>
        <div className="mt-2 flex gap-6">
          <label className="check">
            <input type="radio" name="paperWidth" value="80" defaultChecked={values.paperWidth !== "58"} />
            80 mm
          </label>
          <label className="check">
            <input type="radio" name="paperWidth" value="58" defaultChecked={values.paperWidth === "58"} />
            58 mm
          </label>
        </div>
      </fieldset>
      <label className="field">
        <span>Morning print</span>
        <input name="printTime" type="time" defaultValue={values.printTime} required />
      </label>
      <label className="field">
        <span>Timezone</span>
        <select name="timezone" defaultValue={values.timezone}>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="field-label">Temperature</legend>
        <div className="mt-2 flex gap-6">
          <label className="check">
            <input type="radio" name="units" value="f" defaultChecked={values.units !== "c"} />
            Fahrenheit
          </label>
          <label className="check">
            <input type="radio" name="units" value="c" defaultChecked={values.units === "c"} />
            Celsius
          </label>
        </div>
      </fieldset>
      <label className="check">
        <input type="checkbox" name="printEnabled" defaultChecked={values.printEnabled} />
        Print every morning
      </label>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-stamp" type="submit" disabled={pending}>
          Save
        </button>
        <button className="btn btn-quiet" type="submit" data-intent="test" disabled={pending}>
          {pending ? "Working" : "Save and test print"}
        </button>
      </div>
    </form>
  );
}
