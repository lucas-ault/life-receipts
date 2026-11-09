import { assertOwner, errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { updateSettings } from "@/lib/store";

export async function POST(request: Request) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const body = asRecord(await readJson(request));
    const headlineLimit = Number(body.headlineLimit);
    if (!Number.isInteger(headlineLimit) || headlineLimit < 1 || headlineLimit > 8) {
      throw new HttpError("Choose between 1 and 8 headlines.");
    }
    updateSettings({ headlineLimit });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
