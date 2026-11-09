import { assertOwner, errorResponse } from "@/lib/api";
import { generatePassword, hashPassword } from "@/lib/crypto";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { getUser, updateUser } from "@/lib/store";
import { parsePassword } from "@/lib/validate";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1 || !getUser(id)) throw new HttpError("That person was not found.", 404);
    const body = asRecord(await readJson(request));
    const password = body.generate === true ? generatePassword() : parsePassword(body.password);
    updateUser(id, { passwordHash: hashPassword(password) });
    return Response.json({ ok: true, password });
  } catch (error) {
    return errorResponse(error);
  }
}
