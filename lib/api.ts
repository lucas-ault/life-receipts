import "server-only";

import { HttpError } from "./http";
import { currentUser } from "./session";

export async function assertSession() {
  if (await currentUser()) return null;
  return Response.json({ error: "Sign in required." }, { status: 401 });
}

export async function assertOwner() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "owner") return Response.json({ error: "Only the owner can do that." }, { status: 403 });
  return null;
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  const message = error instanceof Error && error.message ? error.message : "Something went wrong.";
  return Response.json({ error: message }, { status: 500 });
}
