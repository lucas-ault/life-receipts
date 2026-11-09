import "server-only";

import { listEvents } from "@/lib/calendar";
import { fetchHeadlines } from "@/lib/news";
import { noteAuthor } from "@/lib/note-author";
import { householdTodoUrl } from "@/lib/origin";
import { getSettings, listOpenTodos, listPendingNotes, listPlaces, listUsers } from "@/lib/store";
import { dateKey, dayRange, daysBetweenKeys, formatLongDate, todoDueLabel } from "@/lib/time";
import { fetchForecasts } from "@/lib/weather";
import type { ReceiptDocument, ReceiptEvent } from "./types";

export async function buildReceipt(now = new Date()): Promise<{ document: ReceiptDocument; noteIds: number[] }> {
  const settings = getSettings();
  const placeList = listPlaces();
  const pending = listPendingNotes();
  const names = new Map(listUsers().map((person) => [person.id, person.name]));
  const slipDay = dateKey(now, settings.timezone);
  const dayIndex = Math.max(0, daysBetweenKeys(dateKey(new Date(), settings.timezone), slipDay));
  const [weather, headlines, eventsResult] = await Promise.all([
    fetchForecasts(
      placeList.filter((place) => place.weatherEnabled),
      settings.units,
      settings.timezone,
      dayIndex,
    ),
    fetchHeadlines(
      placeList.filter((place) => place.headlinesEnabled),
      settings.headlineLimit,
    ),
    loadEvents(settings.googleRefreshToken, settings.selectedCalendarId, settings.timezone, now),
  ]);

  return {
    noteIds: pending.map((note) => note.id),
    document: {
      dateLabel: formatLongDate(now, settings.timezone),
      weather,
      headlines,
      events: eventsResult.events,
      eventsLabel: dayIndex > 0 ? "Tomorrow" : "Today",
      eventsError: eventsResult.error,
      notes: pending.map((note) => ({ author: noteAuthor(note, names), body: note.body })),
      todos: listOpenTodos().map((todo) => ({
        title: todo.title,
        dueLabel: todoDueLabel(todo.dueDate, slipDay),
        status: todo.status === "in_progress" ? ("in_progress" as const) : ("new" as const),
        author: todo.createdBy ? (names.get(todo.createdBy) ?? null) : null,
      })),
      todoUrl: householdTodoUrl(),
      showWeatherCredit: placeList.some((place) => place.weatherEnabled),
    },
  };
}

async function loadEvents(
  refreshToken: string | null,
  calendarId: string | null,
  timeZone: string,
  now: Date,
): Promise<{ events: ReceiptEvent[] | null; error?: string }> {
  if (!refreshToken) return { events: null };
  if (!calendarId) return { events: null, error: "No calendar selected." };
  try {
    const range = dayRange(now, timeZone);
    const events = await listEvents(calendarId, range.start, range.end, timeZone);
    return { events };
  } catch {
    return { events: null, error: "Calendar could not be loaded." };
  }
}

export function testDocument(host: string, port: number, paperWidth: string, dateLabel: string): ReceiptDocument {
  const width = paperWidth === "58" ? "58 mm" : "80 mm";
  return {
    dateLabel,
    weather: [],
    headlines: [],
    events: [{ when: "Now", title: "Printer test" }],
    notes: [
      {
        author: null,
        body: `If you can read this, ${host}:${port} can print the morning slip on ${width} paper.`,
      },
    ],
    todos: [],
    todoUrl: "",
    showWeatherCredit: false,
  };
}
