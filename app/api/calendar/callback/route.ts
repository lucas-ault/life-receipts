import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAccessCache, exchangeCode } from "@/lib/calendar";
import { encrypt, tokensMatch } from "@/lib/crypto";
import { currentUser } from "@/lib/session";
import { updateSettings } from "@/lib/store";

function redirectWithClearedState(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set("roundup_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (user.role !== "owner") return redirectWithClearedState(request, "/todos");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = (await cookies()).get("roundup_oauth_state")?.value;
  if (!code || !state || !expected || !tokensMatch(state, expected)) {
    return redirectWithClearedState(request, "/calendar?error=denied");
  }
  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) return redirectWithClearedState(request, "/calendar?error=norefresh");
    updateSettings({ googleRefreshToken: encrypt(tokens.refresh_token) });
    clearAccessCache();
    return redirectWithClearedState(request, "/calendar?connected=1");
  } catch {
    return redirectWithClearedState(request, "/calendar?error=token");
  }
}
