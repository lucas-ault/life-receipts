import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { calendarAuthUrl, googleConfigured } from "@/lib/calendar";
import { browserOrigin } from "@/lib/origin";
import { currentUser } from "@/lib/session";

function appRedirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, browserOrigin(request.url, process.env.APP_URL)));
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return appRedirect(request, "/login");
  if (user.role !== "owner") return appRedirect(request, "/todos");
  if (!googleConfigured()) return appRedirect(request, "/calendar?error=config");
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
