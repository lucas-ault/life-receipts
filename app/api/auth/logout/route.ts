import { NextResponse } from "next/server";
import { browserOrigin } from "@/lib/origin";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/login", browserOrigin(request.url, process.env.APP_URL)), 303);
  response.cookies.set("roundup_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
