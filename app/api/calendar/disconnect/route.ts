import { assertOwner, errorResponse } from "@/lib/api";
import { clearAccessCache } from "@/lib/calendar";
import { updateSettings } from "@/lib/store";

export async function POST() {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    updateSettings({
      googleRefreshToken: null,
      selectedCalendarId: null,
      selectedCalendarName: null,
    });
    clearAccessCache();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
