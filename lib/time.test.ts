import { describe, expect, it } from "vitest";
import { addLocalDays, dateKey, dayRange, minutesSinceMidnight, todoDueLabel } from "./time";
import { shouldRunScheduledPrint } from "./schedule-decision";

describe("household clock", () => {
  it("reads a Pacific morning as 7:00 on that date", () => {
    const instant = new Date("2026-11-08T15:00:00.000Z");
    expect(dateKey(instant, "America/Los_Angeles")).toBe("2026-11-08");
    expect(minutesSinceMidnight(instant, "America/Los_Angeles")).toBe(7 * 60);
  });

  it("bounds the local day in standard time and daylight time", () => {
    const winter = dayRange(new Date("2026-11-08T15:00:00.000Z"), "America/Los_Angeles");
    expect(winter.start.toISOString()).toBe("2026-11-08T08:00:00.000Z");
    expect(winter.end.toISOString()).toBe("2026-11-09T08:00:00.000Z");

    const summer = dayRange(new Date("2026-07-08T15:00:00.000Z"), "America/Los_Angeles");
    expect(summer.key).toBe("2026-07-08");
    expect(summer.start.toISOString()).toBe("2026-07-08T07:00:00.000Z");
    expect(summer.end.toISOString()).toBe("2026-07-09T07:00:00.000Z");
  });

  it("steps to noon on the next local day", () => {
    const tomorrow = addLocalDays(new Date("2026-11-08T15:00:00.000Z"), "America/Los_Angeles", 1);
    expect(dateKey(tomorrow, "America/Los_Angeles")).toBe("2026-11-09");
    expect(tomorrow.toISOString()).toBe("2026-11-09T20:00:00.000Z");
  });
});

describe("shouldRunScheduledPrint", () => {
  const ready = {
    enabled: true,
    hasPrinter: true,
    nowMinutes: 7 * 60,
    printMinutes: 7 * 60,
    alreadySucceeded: false,
    jobInProgress: false,
  };

  it("prints once the clock reaches the chosen time", () => {
    expect(shouldRunScheduledPrint(ready)).toBe(true);
    expect(shouldRunScheduledPrint({ ...ready, nowMinutes: 7 * 60 - 1 })).toBe(false);
  });

  it("waits when the morning print is paused, already done, or already running", () => {
    expect(shouldRunScheduledPrint({ ...ready, enabled: false })).toBe(false);
    expect(shouldRunScheduledPrint({ ...ready, hasPrinter: false })).toBe(false);
    expect(shouldRunScheduledPrint({ ...ready, alreadySucceeded: true })).toBe(false);
    expect(shouldRunScheduledPrint({ ...ready, jobInProgress: true })).toBe(false);
  });
});

describe("todo due labels", () => {
  it("keeps a missed date visible and names the slip day", () => {
    expect(todoDueLabel("2026-11-07", "2026-11-09")).toBe("Overdue");
    expect(todoDueLabel("2026-11-09", "2026-11-09")).toBe("Today");
    expect(todoDueLabel("2026-11-10", "2026-11-09")).toBe("Tomorrow");
    expect(todoDueLabel("2026-11-12", "2026-11-09")).toBe("Nov 12");
  });
});
