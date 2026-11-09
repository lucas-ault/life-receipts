import { errorResponse } from "@/lib/api";
import { tokensMatch } from "@/lib/crypto";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { getSettings, insertNote } from "@/lib/store";
import { parseNote } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = asRecord(await readJson(request));
    const token = typeof body.token === "string" ? body.token : "";
    if (!tokensMatch(token, getSettings().publicToken)) throw new HttpError("This note page is not active.", 404);
    if (!allowRequest(`note:${clientKey(request)}`, 5, 10 * 60 * 1000)) {
      throw new HttpError("Too many notes from this network. Try again in a few minutes.", 429);
    }
    const note = parseNote(body);
    insertNote({ ...note, source: "public" });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
