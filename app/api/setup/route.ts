import { errorResponse } from "@/lib/api";
import { hashPassword } from "@/lib/crypto";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { setSession } from "@/lib/session";
import { getOwner, getUserByUsername, insertUser, updateSettings } from "@/lib/store";
import { isTimeZone } from "@/lib/time";
import { parseDisplayName, parsePassword, parseUsername } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    if (getOwner()) throw new HttpError("This app is already set up.", 409);
    const body = asRecord(await readJson(request));
    const name = parseDisplayName(body.name);
    const username = parseUsername(body.username);
    const password = parsePassword(body.password);
    if (body.confirm !== password) throw new HttpError("The passwords don’t match.");
    if (getUserByUsername(username)) throw new HttpError("That username is taken.");
    const timezone = typeof body.timezone === "string" ? body.timezone : "";
    if (!isTimeZone(timezone)) throw new HttpError("Choose a timezone.");
    const units = body.units === "c" ? "c" : "f";
    const id = insertUser({ name, username, passwordHash: hashPassword(password), role: "owner" });
    updateSettings({ timezone, units });
    await setSession({ uid: id, role: "owner" });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
