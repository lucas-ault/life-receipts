import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set("roundup_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
