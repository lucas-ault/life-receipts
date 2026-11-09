import "server-only";

import type { Settings, Todo } from "@/db/schema";
import { rgbaToEscPos } from "./escpos";
import { HttpError } from "./http";
import { householdOrigin } from "./origin";
import { sendRaw } from "./printer";
import { buildReceipt, testDocument } from "./receipt/build";
import { paperDots, renderReceipt, renderTicket } from "./receipt/raster";
import {
  finishJob,
  getSettings,
  getTodo,
  getUser,
  insertJob,
  listUnprintedTodoCards,
  markNotesPrinted,
  markTodoCardPrinted,
} from "./store";
import { todoBoardTicket } from "./tickets";
import { addLocalDays, dateKey, formatLongDate } from "./time";

let printing = false;

export async function printRoundup(trigger: "schedule" | "manual") {
  return withPrinter(async (settings) => {
    const startedAt = Date.now();
    const key = dateKey(new Date(startedAt), settings.timezone);
    const jobId = insertJob({ dateKey: key, status: "running", trigger, startedAt });
    try {
      const { document, noteIds } = await buildReceipt(new Date(startedAt));
      const rendered = renderReceipt(document, paperDots(settings.paperWidth));
      await sendRaw(settings.printerHost, settings.printerPort, rgbaToEscPos(rendered.rgba, rendered.width, rendered.height));
      markNotesPrinted(noteIds);
      finishJob(jobId, "success");
    } catch (error) {
      finishJob(jobId, "failed", error instanceof Error ? error.message : "The print failed.");
      throw error;
    }
    try {
      await printUnprintedTodoCards(settings);
    } catch (error) {
      console.error("To-do cards did not finish printing:", error instanceof Error ? error.message : error);
      if (trigger === "manual") {
        throw new HttpError("The slip printed, but a to-do card did not. The rest will print with the next morning slip.");
      }
    }
  });
}

export async function printTodoCard(id: number) {
  return withPrinter(async (settings) => {
    const todo = getTodo(id);
    if (!todo || (todo.status !== "new" && todo.status !== "in_progress")) {
      throw new HttpError("That to-do is not on the board.");
    }
    await sendTodoCard(settings, todo);
    markTodoCardPrinted(todo.id);
  });
}

async function printUnprintedTodoCards(settings: Settings) {
  for (const todo of listUnprintedTodoCards()) {
    const current = getTodo(todo.id);
    if (!current || current.cardPrintedAt != null) continue;
    if (current.status !== "new" && current.status !== "in_progress") continue;
    await sendTodoCard(settings, current);
    markTodoCardPrinted(current.id);
  }
}

async function sendTodoCard(settings: Settings, todo: Todo) {
  const author = todo.createdBy ? (getUser(todo.createdBy)?.name ?? null) : null;
  const ticket = todoBoardTicket({ ...todo, author }, householdOrigin());
  const rendered = renderTicket(ticket, paperDots(settings.paperWidth));
  await sendRaw(settings.printerHost, settings.printerPort, rgbaToEscPos(rendered.rgba, rendered.width, rendered.height));
}

export async function printTomorrowSlip() {
  return withPrinter(async (settings) => {
    const when = addLocalDays(new Date(), settings.timezone, 1);
    const startedAt = Date.now();
    const jobId = insertJob({
      dateKey: dateKey(when, settings.timezone),
      status: "running",
      trigger: "tomorrow",
      startedAt,
    });
    try {
      const { document } = await buildReceipt(when);
      const rendered = renderReceipt(document, paperDots(settings.paperWidth));
      await sendRaw(settings.printerHost, settings.printerPort, rgbaToEscPos(rendered.rgba, rendered.width, rendered.height));
      finishJob(jobId, "success");
    } catch (error) {
      finishJob(jobId, "failed", error instanceof Error ? error.message : "The print failed.");
      throw error;
    }
  });
}

export async function printTestSlip() {
  return withPrinter(async (settings) => {
    const startedAt = Date.now();
    const key = dateKey(new Date(startedAt), settings.timezone);
    const jobId = insertJob({ dateKey: key, status: "running", trigger: "test", startedAt });
    try {
      const document = testDocument(
        settings.printerHost,
        settings.printerPort,
        settings.paperWidth,
        formatLongDate(new Date(startedAt), settings.timezone),
      );
      const rendered = renderReceipt(document, paperDots(settings.paperWidth));
      await sendRaw(settings.printerHost, settings.printerPort, rgbaToEscPos(rendered.rgba, rendered.width, rendered.height));
      finishJob(jobId, "success");
    } catch (error) {
      finishJob(jobId, "failed", error instanceof Error ? error.message : "The test print failed.");
      throw error;
    }
  });
}

async function withPrinter(work: (settings: ReturnType<typeof getSettings>) => Promise<void>) {
  if (printing) throw new HttpError("A print is already running.");
  const settings = getSettings();
  if (!settings.printerHost) throw new HttpError("Set a printer address first.");
  printing = true;
  try {
    await work(settings);
  } finally {
    printing = false;
  }
}

export async function renderSlip(when = new Date()) {
  const settings = getSettings();
  const { document } = await buildReceipt(when);
  return renderReceipt(document, paperDots(settings.paperWidth));
}

export async function renderCurrentSlip() {
  return renderSlip();
}

export async function renderTomorrowSlip() {
  const settings = getSettings();
  return renderSlip(addLocalDays(new Date(), settings.timezone, 1));
}
