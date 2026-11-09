import { assertOwner, errorResponse } from "@/lib/api";
import { printTestSlip } from "@/lib/print-job";

export async function POST() {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    await printTestSlip();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
