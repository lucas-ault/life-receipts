import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { isRole, type Role } from "./access";
import { getSecret } from "./secret";
import { getUser } from "./store";
import type { User } from "@/db/schema";

export type Actor = User & { role: Role };

const COOKIE = "roundup_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = { uid: number; role: Role };

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function signSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ uid: user.uid, role: user.role, exp: Date.now() + MAX_AGE * 1000 })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid?: unknown; role?: unknown; exp?: unknown };
    if (typeof data.uid !== "number" || !Number.isInteger(data.uid) || data.uid < 1) return null;
    if (!isRole(data.role)) return null;
    if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    return { uid: data.uid, role: data.role };
  } catch {
    return null;
  }
}

function options(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge,
  };
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function currentUser(): Promise<Actor | null> {
  const session = await getSession();
  if (!session) return null;
  const user = getUser(session.uid);
  if (!user || !isRole(user.role) || user.role !== session.role) return null;
  return { ...user, role: user.role };
}

export async function setSession(user: SessionUser) {
  const jar = await cookies();
  jar.set(COOKIE, signSession(user), options(MAX_AGE));
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", options(0));
}
