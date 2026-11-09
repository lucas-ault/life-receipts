import { assertOwner, errorResponse } from "@/lib/api";
import { asRecord, readJson } from "@/lib/http";
import { updateSettings } from "@/lib/store";
import { parsePrinter } from "@/lib/validate";

export async function POST(request: Request) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const settings = parsePrinter(asRecord(await readJson(request)));
    updateSettings(settings);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
