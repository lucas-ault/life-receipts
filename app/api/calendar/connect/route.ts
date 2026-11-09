import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { calendarAuthUrl, googleConfigured } from "@/lib/calendar";
import { currentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (user.role !== "owner") return NextResponse.redirect(new URL("/todos", request.url));
  if (!googleConfigured()) return NextResponse.redirect(new URL("/calendar?error=config", request.url));
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(calendarAuthUrl(state));
  response.cookies.set("roundup_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
