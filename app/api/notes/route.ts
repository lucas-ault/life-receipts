import { assertSession, errorResponse } from "@/lib/api";
import { asRecord, readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { insertNote } from "@/lib/store";
import { parseNote } from "@/lib/validate";

export async function POST(request: Request) {
  const denied = await assertSession();
  if (denied) return denied;
  try {
    const user = await currentUser();
    const note = parseNote(asRecord(await readJson(request)));
    insertNote({ ...note, author: note.author ?? user?.name ?? null, source: "admin" });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
