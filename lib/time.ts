export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday ?? "",
  };
}

export function dateKey(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function minutesSinceMidnight(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function parsePrintMinutes(printTime: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(printTime);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatLongDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatPrintTime(printTime: string) {
  const minutes = parsePrintMinutes(printTime);
  if (minutes == null) return printTime;
  const date = new Date(Date.UTC(2026, 0, 1, Math.floor(minutes / 60), minutes % 60));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function offsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

/** Wall-clock date and time in `timeZone`, returned as a UTC instant. */
export function zonedWallTime(day: string, time: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, date, hour, minute, 0));
  const first = offsetMs(guess, timeZone);
  const utc = new Date(guess.getTime() - first);
  const second = offsetMs(utc, timeZone);
  if (second !== first) return new Date(guess.getTime() - second);
  return utc;
}

export function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(shifted.getUTCDate()).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

export function formatMonthDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** Short due label for a slip dated `slipDay`. Past dates stay visible as overdue. */
export function todoDueLabel(due: string, slipDay: string) {
  const delta = daysBetweenKeys(slipDay, due);
  if (delta < 0) return "Overdue";
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  return formatMonthDay(due);
}

export function daysBetweenKeys(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** Noon on the local day `days` away from `date`. */
export function addLocalDays(date: Date, timeZone: string, days: number) {
  return zonedWallTime(shiftDateKey(dateKey(date, timeZone), days), "12:00", timeZone);
}

export function dayRange(date: Date, timeZone: string) {
  const key = dateKey(date, timeZone);
  const start = zonedWallTime(key, "00:00", timeZone);
  const nextKey = dateKey(new Date(start.getTime() + 36 * 60 * 60 * 1000), timeZone);
  const end = zonedWallTime(nextKey, "00:00", timeZone);
  return { start, end, key };
}

export function isTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
