import { renderTomorrowSlip } from "@/lib/print-job";
import { getSettings } from "@/lib/store";
import { addLocalDays, formatLongDate } from "@/lib/time";

export const metadata = { title: "Tomorrow" };

export default async function TomorrowPage() {
  const settings = getSettings();
  const tomorrow = addLocalDays(new Date(), settings.timezone, 1);
  let preview: { src: string; width: number; height: number } | null = null;
  let previewError = "";
  try {
    const rendered = await renderTomorrowSlip();
    preview = {
      src: `data:image/png;base64,${rendered.png.toString("base64")}`,
      width: rendered.width,
      height: rendered.height,
    };
  } catch (error) {
    previewError = error instanceof Error ? error.message : "The slip could not be drawn.";
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside>
        <p className="font-serif text-3xl leading-tight">Tomorrow’s slip</p>
        <p className="mt-4 text-sm text-muted">
          A preview of {formatLongDate(tomorrow, settings.timezone)}. Nothing is sent to the printer from this page.
        </p>
        <p className="mt-2 text-sm text-muted">
          Weather and calendar are tomorrow’s. Headlines are the current feed. Open to-dos and pending notes are included.
        </p>
      </aside>
      <div className="flex justify-center lg:justify-start">
        {preview ? (
          <img
            className="slip h-auto"
            src={preview.src}
            width={preview.width}
            height={preview.height}
            alt="Preview of tomorrow’s morning slip"
          />
        ) : (
          <p className="error">{previewError}</p>
        )}
      </div>
    </div>
  );
}
