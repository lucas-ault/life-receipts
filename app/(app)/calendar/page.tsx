import { CalendarManager } from "@/components/calendar-manager";
import { googleConfigured, listCalendars, redirectUri } from "@/lib/calendar";
import { getSettings } from "@/lib/store";

export const metadata = { title: "Calendar" };

const messages: Record<string, string> = {
  denied: "Google did not complete the connection.",
  norefresh: "Google did not grant offline access. Connect again and allow continued access.",
  token: "Google did not accept the calendar sign-in.",
  config: "Add the Google client id, secret, and APP_URL, then restart.",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const params = await searchParams;
  const settings = getSettings();
  const configured = googleConfigured();
  let calendars: Array<{ id: string; name: string; primary: boolean }> = [];
  let loadError = params.error ? messages[params.error] || "The calendar connection failed." : "";
  if (configured && settings.googleRefreshToken) {
    try {
      calendars = await listCalendars();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "The calendar list could not be loaded.";
    }
  }
  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">Calendar</h1>
      <p className="mt-3 max-w-xl text-muted">One calendar supplies today’s events. The slip uses the household timezone.</p>
      {params.connected ? <p className="mt-4 text-sm text-muted">Google Calendar is connected.</p> : null}
      <CalendarManager
        configured={configured}
        connected={Boolean(settings.googleRefreshToken)}
        redirectUri={process.env.APP_URL ? redirectUri() : ""}
        calendars={calendars}
        selectedId={settings.selectedCalendarId}
        loadError={loadError}
      />
    </>
  );
}
