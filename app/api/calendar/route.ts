import { assertOwner, errorResponse } from "@/lib/api";
import { clearAccessCache } from "@/lib/calendar";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { updateSettings } from "@/lib/store";
import { cleanText } from "@/lib/validate";

export async function POST(request: Request) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const body = asRecord(await readJson(request));
    const calendarId = cleanText(body.calendarId, 200);
    const calendarName = cleanText(body.calendarName, 200);
    if (!calendarId || !calendarName) throw new HttpError("Choose a calendar.");
    updateSettings({ selectedCalendarId: calendarId, selectedCalendarName: calendarName });
    clearAccessCache();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
