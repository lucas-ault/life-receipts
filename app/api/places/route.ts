import { assertOwner, errorResponse } from "@/lib/api";
import { asRecord, HttpError, readJson } from "@/lib/http";
import { googleNewsRss } from "@/lib/rss";
import { insertPlace, listPlaces } from "@/lib/store";
import { cleanText, isHttpUrl } from "@/lib/validate";
import { searchPlaces } from "@/lib/weather";

export async function GET(request: Request) {
  const denied = await assertOwner();
  if (denied) return denied;
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ error: "Type at least two letters." }, { status: 400 });
  try {
    const results = (await searchPlaces(query)).map((hit) => ({ ...hit, rssUrl: googleNewsRss(hit.name) }));
    return Response.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await assertOwner();
  if (denied) return denied;
  try {
    const body = asRecord(await readJson(request));
    const name = cleanText(body.name, 80);
    const detail = cleanText(body.detail, 120);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const rssUrl = typeof body.rssUrl === "string" ? body.rssUrl.trim() : "";
    const timezone = cleanText(body.timezone, 80);
    if (!name) throw new HttpError("Give the place a name.");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new HttpError("That place is missing a latitude.");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new HttpError("That place is missing a longitude.");
    if (!isHttpUrl(rssUrl)) throw new HttpError("The headline feed must be an http or https URL.");
    if (listPlaces().length >= 12) throw new HttpError("Twelve places is the limit, so the slip stays short.");
    insertPlace({
      name,
      detail,
      latitude,
      longitude,
      timezone,
      rssUrl,
      weatherEnabled: body.weatherEnabled !== false,
      headlinesEnabled: body.headlinesEnabled !== false,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
