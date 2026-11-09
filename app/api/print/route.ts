import { assertOwner, errorResponse } from "@/lib/api";
import { printRoundup } from "@/lib/print-job";

export async function POST() {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    await printRoundup("manual");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
