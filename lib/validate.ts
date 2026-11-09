import { HttpError } from "./http";
import { isTimeZone, parsePrintMinutes } from "./time";
import { isTodoStatus, type TodoStatus } from "./todos";

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function parsePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 200) {
    throw new HttpError("Use a password of at least 8 characters.");
  }
  return value;
}

export function parseDisplayName(value: unknown) {
  const name = cleanText(value, 40);
  if (!name) throw new HttpError("Add a name.");
  if (typeof value === "string" && value.trim().length > 40) throw new HttpError("Names can be up to 40 characters.");
  return name;
}

export function parseUsername(value: unknown) {
  const username = cleanText(value, 32).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) {
    throw new HttpError("Usernames are 2–32 characters and use letters, numbers, and . _ -.");
  }
  return username;
}

export function parseNote(input: Record<string, unknown>) {
  const author = cleanText(input.author, 40);
  const body = cleanText(input.body, 500);
  if (!body) throw new HttpError("Write a note first.");
  if (typeof input.body === "string" && input.body.trim().length > 500) {
    throw new HttpError("Notes can be up to 500 characters.");
  }
  if (typeof input.author === "string" && input.author.trim().length > 40) {
    throw new HttpError("Names can be up to 40 characters.");
  }
  return { author: author || null, body };
}

export function parseDueDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError("Choose a due date.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new HttpError("Choose a due date.");
  }
  return value;
}

export function parseDescription(value: unknown) {
  const description = cleanText(value, 200);
  if (typeof value === "string" && value.trim().length > 200) {
    throw new HttpError("The short description can be up to 200 characters.");
  }
  return description;
}

export function parseTodo(input: Record<string, unknown>) {
  const title = cleanText(input.title, 140);
  if (!title) throw new HttpError("Write a to-do first.");
  if (typeof input.title === "string" && input.title.trim().length > 140) {
    throw new HttpError("To-dos can be up to 140 characters.");
  }
  return {
    title,
    description: parseDescription(input.description),
    dueDate: parseDueDate(input.dueDate),
    printCard: input.printCard === true,
  };
}

export function parseTodoPatch(input: Record<string, unknown>) {
  const patch: { title?: string; description?: string; dueDate?: string; status?: TodoStatus } = {};
  if ("title" in input) {
    const title = cleanText(input.title, 140);
    if (!title) throw new HttpError("Write a to-do first.");
    patch.title = title;
  }
  if ("description" in input) patch.description = parseDescription(input.description);
  if ("dueDate" in input) patch.dueDate = parseDueDate(input.dueDate);
  if ("status" in input) {
    if (!isTodoStatus(input.status) || input.status === "pending") {
      throw new HttpError("Choose new, in progress, or done.");
    }
    patch.status = input.status;
  }
  if (patch.title == null && patch.description == null && patch.dueDate == null && patch.status == null) {
    throw new HttpError("Nothing to update.");
  }
  return patch;
}

export function parseTodoNote(input: Record<string, unknown>) {
  const body = cleanText(input.body, 1000);
  if (!body) throw new HttpError("Write a note first.");
  if (typeof input.body === "string" && input.body.trim().length > 1000) {
    throw new HttpError("Notes can be up to 1000 characters.");
  }
  return { body };
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parsePrinter(input: Record<string, unknown>) {
  const printerHost = cleanText(input.printerHost, 253);
  const printerPort = Number(input.printerPort);
  const paperWidth = input.paperWidth === "58" ? "58" : input.paperWidth === "80" ? "80" : "";
  const printTime = typeof input.printTime === "string" ? input.printTime : "";
  const timezone = typeof input.timezone === "string" ? input.timezone : "";
  const units = input.units === "c" ? "c" : input.units === "f" ? "f" : "";
  const printEnabled = input.printEnabled === true;
  if (printerHost && !/^[A-Za-z0-9.-]+$/.test(printerHost)) {
    throw new HttpError("The printer address should be a hostname or IP address.");
  }
  if (!Number.isInteger(printerPort) || printerPort < 1 || printerPort > 65535) {
    throw new HttpError("The printer port needs to be between 1 and 65535.");
  }
  if (!paperWidth) throw new HttpError("Choose 58 mm or 80 mm paper.");
  if (parsePrintMinutes(printTime) == null) throw new HttpError("Set the print time as HH:MM.");
  if (!isTimeZone(timezone)) throw new HttpError("Choose a timezone.");
  if (!units) throw new HttpError("Choose Fahrenheit or Celsius.");
  if (printEnabled && !printerHost) throw new HttpError("Add the printer address before turning on the morning print.");
  return { printerHost, printerPort, paperWidth, printTime, timezone, units, printEnabled };
}
