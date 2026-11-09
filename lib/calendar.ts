import "server-only";

import { fetchTimeout } from "./http";
import { decrypt } from "./crypto";
import { getSettings } from "./store";
import { formatClock } from "./time";
import type { ReceiptEvent } from "./receipt/types";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
};

let cache: { token: string; exp: number } | null = null;

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);
}

export function redirectUri() {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Set APP_URL in the environment.");
  return `${base}/api/calendar/callback`;
}

export function calendarAuthUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", required("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

function required(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error("Google calendar sign-in is not configured.");
  return value;
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetchTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await response.json()) as TokenResponse;
  if (!response.ok || !json.access_token) throw new Error("Google did not accept the calendar sign-in.");
  return json;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: required("GOOGLE_CLIENT_ID"),
    client_secret: required("GOOGLE_CLIENT_SECRET"),
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  return tokenRequest(body);
}

export function clearAccessCache() {
  cache = null;
}

export async function getAccessToken(force = false) {
  if (!force && cache && cache.exp > Date.now() + 30_000) return cache.token;
  const settings = getSettings();
  if (!settings.googleRefreshToken) throw new Error("Calendar is not connected.");
  const refreshed = await tokenRequest(
    new URLSearchParams({
      refresh_token: decrypt(settings.googleRefreshToken),
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  );
  cache = { token: refreshed.access_token!, exp: Date.now() + (refreshed.expires_in ?? 3600) * 1000 };
  return cache.token;
}

async function calendarGet(path: string) {
  const run = async (force: boolean) => {
    const token = await getAccessToken(force);
    return fetchTimeout(`https://www.googleapis.com/calendar/v3${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  };
  let response = await run(false);
  if (response.status === 401) response = await run(true);
  if (!response.ok) throw new Error("The calendar request failed.");
  return response.json() as Promise<Record<string, unknown>>;
}

export type CalendarChoice = { id: string; name: string; primary: boolean };

export async function listCalendars(): Promise<CalendarChoice[]> {
  const items: CalendarChoice[] = [];
  let pageToken = "";
  do {
    const data = await calendarGet(
      `/users/me/calendarList?minAccessRole=reader&maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
    );
    const batch = Array.isArray(data.items) ? data.items : [];
    for (const item of batch) {
      const row = item as { id?: string; summary?: string; primary?: boolean };
      if (!row.id) continue;
      items.push({ id: row.id, name: row.summary || row.id, primary: Boolean(row.primary) });
    }
    pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
  } while (pageToken && items.length < 250);
  return items.sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name));
}

type EventWhen = { date?: string; dateTime?: string };
type GoogleEvent = {
  id?: string;
  summary?: string;
  status?: string;
  start?: EventWhen;
  end?: EventWhen;
};

function eventLabel(event: GoogleEvent, timeZone: string) {
  const start = event.start ?? {};
  const end = event.end ?? {};
  if (start.date && !start.dateTime) return "All day";
  if (!start.dateTime) return "Scheduled";
  const startDate = new Date(start.dateTime);
  if (!end.dateTime) return formatClock(startDate, timeZone);
  const endDate = new Date(end.dateTime);
  if (endDate.getTime() - startDate.getTime() < 60_000) return formatClock(startDate, timeZone);
  return compactRange(startDate, endDate, timeZone);
}

function clockParts(date: Date, timeZone: string) {
  const map: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return map;
}

function compactRange(start: Date, end: Date, timeZone: string) {
  const from = clockParts(start, timeZone);
  const to = clockParts(end, timeZone);
  const startText = `${from.hour}:${from.minute}`;
  const endText = `${to.hour}:${to.minute}`;
  if ((from.dayPeriod || "").toLowerCase() === (to.dayPeriod || "").toLowerCase()) {
    return `${startText}–${endText} ${to.dayPeriod}`;
  }
  return `${startText} ${from.dayPeriod}–${endText} ${to.dayPeriod}`;
}

/** Events between two instants. A wider window can feed a later look-ahead section. */
export async function listEvents(calendarId: string, timeMin: Date, timeMax: Date, timeZone: string): Promise<ReceiptEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "40",
    timeZone,
  });
  const data = await calendarGet(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
  const items = (Array.isArray(data.items) ? data.items : []) as GoogleEvent[];
  const events = items
    .filter((event) => event.status !== "cancelled")
    .map((event) => ({
      when: eventLabel(event, timeZone),
      title: (event.summary || "Busy").slice(0, 140),
      allDay: Boolean(event.start?.date && !event.start?.dateTime),
    }));
  return events
    .sort((a, b) => Number(b.allDay) - Number(a.allDay))
    .map(({ when, title }) => ({ when, title }));
}
