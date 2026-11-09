import "server-only";

import { printRoundup } from "./print-job";
import { shouldRunScheduledPrint } from "./schedule-decision";
import { failStaleJobs, getSettings, hasFreshRunning, scheduledSuccess } from "./store";
import { dateKey, minutesSinceMidnight, parsePrintMinutes } from "./time";

export function startScheduler() {
  if (process.env.VITEST) return;
  const globalState = globalThis as { __roundupScheduler?: boolean };
  if (globalState.__roundupScheduler) return;
  globalState.__roundupScheduler = true;
  const timer = setInterval(() => {
    void tick();
  }, 20_000);
  timer.unref?.();
  void tick();
  console.log("Morning print scheduler is running.");
}

async function tick() {
  try {
    failStaleJobs();
    const settings = getSettings();
    const now = new Date();
    const printMinutes = parsePrintMinutes(settings.printTime) ?? 7 * 60;
    const run = shouldRunScheduledPrint({
      enabled: settings.printEnabled,
      hasPrinter: settings.printerHost.trim().length > 0,
      nowMinutes: minutesSinceMidnight(now, settings.timezone),
      printMinutes,
      alreadySucceeded: Boolean(scheduledSuccess(dateKey(now, settings.timezone))),
      jobInProgress: hasFreshRunning(),
    });
    if (!run) return;
    await printRoundup("schedule");
  } catch (error) {
    console.error("Morning print failed:", error instanceof Error ? error.message : error);
  }
}
