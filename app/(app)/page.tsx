import { PrintButton } from "@/components/print-button";
import { renderCurrentSlip } from "@/lib/print-job";
import { latestJob, getSettings } from "@/lib/store";
import { formatClock, formatPrintTime } from "@/lib/time";

export default async function HomePage() {
  const settings = getSettings();
  let preview: { src: string; width: number; height: number } | null = null;
  let previewError = "";
  try {
    const rendered = await renderCurrentSlip();
    preview = {
      src: `data:image/png;base64,${rendered.png.toString("base64")}`,
      width: rendered.width,
      height: rendered.height,
    };
  } catch (error) {
    previewError = error instanceof Error ? error.message : "The slip could not be drawn.";
  }
  const job = latestJob();
  const summary = describeJob(job, settings.timezone);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside>
        <p className="font-serif text-3xl leading-tight">Today’s slip</p>
        <p className="mt-4 text-sm text-muted">
          {settings.printEnabled ? "Morning print is on" : "Morning print is paused"} at {formatPrintTime(settings.printTime)}.
        </p>
        <p className="mt-2 text-sm text-muted">{summary}</p>
        {!settings.googleRefreshToken ? <p className="mt-2 text-sm text-muted">Calendar isn’t connected.</p> : null}
        {settings.googleRefreshToken && !settings.selectedCalendarId ? (
          <p className="mt-2 text-sm text-muted">Pick a calendar to include today.</p>
        ) : null}
        <PrintButton disabled={!settings.printerHost} />
        {!settings.printerHost ? <p className="mt-3 text-sm text-muted">Add a printer before printing.</p> : null}
      </aside>
      <div className="flex justify-center lg:justify-start">
        {preview ? (
          <img
            className="slip h-auto"
            src={preview.src}
            width={preview.width}
            height={preview.height}
            alt="Preview of today’s morning slip"
          />
        ) : (
          <p className="error">{previewError}</p>
        )}
      </div>
    </div>
  );
}

function describeJob(
  job: { status: string; trigger: string; error: string | null; finishedAt: number | null } | undefined,
  timeZone: string,
) {
  if (!job) return "No slip printed yet.";
  if (job.status === "running" || !job.finishedAt) return "A print is running.";
  const when = formatClock(new Date(job.finishedAt), timeZone);
  const kind = job.trigger === "test" ? "Test print" : job.trigger === "manual" ? "Print" : "Morning print";
  if (job.status === "success") return `${kind} succeeded at ${when}.`;
  return `${kind} failed at ${when}. ${job.error ?? ""}`.trim();
}
