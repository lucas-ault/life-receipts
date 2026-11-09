import { assertOwner, errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { deletePlace, movePlace, updatePlace } from "@/lib/store";
import { cleanText, isHttpUrl } from "@/lib/validate";

type Context = { params: Promise<{ id: string }> };

function idFrom(params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError("That place was not found.", 404);
  return id;
}

export async function PATCH(request: Request, context: Context) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = idFrom(await context.params);
    const body = asRecord(await readJson(request));
    const name = cleanText(body.name, 80);
    const rssUrl = typeof body.rssUrl === "string" ? body.rssUrl.trim() : "";
    if (!name) throw new HttpError("Give the place a name.");
    if (!isHttpUrl(rssUrl)) throw new HttpError("The headline feed must be an http or https URL.");
    updatePlace(id, {
      name,
      rssUrl,
      weatherEnabled: body.weatherEnabled === true,
      headlinesEnabled: body.headlinesEnabled === true,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const id = idFrom(await context.params);
    const body = asRecord(await readJson(request));
    if (body.direction !== "up" && body.direction !== "down") throw new HttpError("Choose up or down.");
    movePlace(id, body.direction);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    deletePlace(idFrom(await context.params));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
