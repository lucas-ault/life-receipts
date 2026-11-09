import { PrinterForm } from "@/components/printer-form";
import { getSettings, latestJob } from "@/lib/store";
import { formatClock } from "@/lib/time";

export const metadata = { title: "Printer" };

export default function PrinterPage() {
  const settings = getSettings();
  const job = latestJob();
  const zones = Intl.supportedValuesOf("timeZone");
  const timeZones = zones.includes(settings.timezone) ? zones : [settings.timezone, ...zones];
  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">Printer</h1>
      <p className="mt-3 max-w-xl text-muted">
        The app sends a black-and-white image to a receipt printer on this network. Save the address, then print a short test.
      </p>
      {job?.status === "failed" && job.error ? <p className="error mt-4">Last attempt: {job.error}</p> : null}
      {job?.status === "success" && job.finishedAt ? (
        <p className="mt-4 text-sm text-muted">Last success at {formatClock(new Date(job.finishedAt), settings.timezone)}.</p>
      ) : null}
      <PrinterForm
        timeZones={timeZones}
        values={{
          printerHost: settings.printerHost,
          printerPort: settings.printerPort,
          paperWidth: settings.paperWidth,
          printTime: settings.printTime,
          printEnabled: settings.printEnabled,
          timezone: settings.timezone,
          units: settings.units,
        }}
      />
    </>
  );
}
