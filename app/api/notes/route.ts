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
    if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
    const { body } = parseNote({ body: asRecord(await readJson(request)).body });
    insertNote({ author: user.name, userId: user.id, body, source: "admin" });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
