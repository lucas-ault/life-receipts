import { randomBytes } from "crypto";
import { assertOwner, errorResponse } from "@/lib/api";
import { updateSettings } from "@/lib/store";

export async function POST() {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    updateSettings({ publicToken: randomBytes(24).toString("hex") });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
