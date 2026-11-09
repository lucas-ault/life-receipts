import { assertOwner, errorResponse } from "@/lib/api";
import { generatePassword, hashPassword } from "@/lib/crypto";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { getUserByUsername, insertUser } from "@/lib/store";
import { parseDisplayName, parsePassword, parseUsername } from "@/lib/validate";

export async function POST(request: Request) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const body = asRecord(await readJson(request));
    const name = parseDisplayName(body.name);
    const username = parseUsername(body.username);
    if (getUserByUsername(username)) throw new HttpError("That username is taken.");
    const password = body.generate === true ? generatePassword() : parsePassword(body.password);
    insertUser({ name, username, passwordHash: hashPassword(password), role: "member" });
    return Response.json({ ok: true, username, password });
  } catch (error) {
    return errorResponse(error);
  }
}
