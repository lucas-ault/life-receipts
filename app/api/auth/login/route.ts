import { errorResponse } from "@/lib/api";
import { isRole } from "@/lib/access";
import { verifyPassword } from "@/lib/crypto";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { setSession } from "@/lib/session";
import { getOwner, getUserByUsername } from "@/lib/store";
import { parseUsername } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    if (!getOwner()) throw new HttpError("Set up the owner account first.", 409);
    const body = asRecord(await readJson(request));
    const password = typeof body.password === "string" ? body.password : "";
    let username = "";
    try {
      username = parseUsername(body.username);
    } catch {
      username = "";
    }
    const user = username ? getUserByUsername(username) : undefined;
    if (!user || !isRole(user.role) || !verifyPassword(password, user.passwordHash)) {
      throw new HttpError("That sign-in doesn’t match.", 401);
    }
    await setSession({ uid: user.id, role: user.role });
    return Response.json({ ok: true, role: user.role });
  } catch (error) {
    return errorResponse(error);
  }
}
