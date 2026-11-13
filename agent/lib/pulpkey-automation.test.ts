import { describe, expect, it } from "vitest";

import { localDateParts, nextRecurrence } from "#lib/pulpkey-automation.js";

describe(nextRecurrence, () => {
  const friday = new Date("2026-11-13T04:30:00.000Z");

  it("skips weekends for weekday schedules", () => {
    expect(nextRecurrence(friday, "weekdays")?.toISOString()).toBe(
      "2026-11-16T04:30:00.000Z"
    );
  });

  it("keeps the instant-of-day for weekly and yearly schedules", () => {
    expect(nextRecurrence(friday, "weekly")?.toISOString()).toBe(
      "2026-11-20T04:30:00.000Z"
    );
    expect(nextRecurrence(friday, "yearly")?.toISOString()).toBe(
      "2027-11-13T04:30:00.000Z"
    );
  });

  it("ends one-time schedules", () => {
    expect(nextRecurrence(friday, "once")).toBeNull();
  });

  it("preserves local wall-clock time across daylight-saving changes", () => {
    const beforeDst = new Date("2027-03-07T14:00:00.000Z");
    expect(
      nextRecurrence(beforeDst, "weekly", "America/New_York")?.toISOString()
    ).toBe("2027-03-14T13:00:00.000Z");
  });
});

describe(localDateParts, () => {
  it("uses the automation timezone at the UTC date boundary", () => {
    const instant = new Date("2026-11-12T20:00:00.000Z");
    expect(localDateParts(instant, "Asia/Kolkata")).toStrictEqual({
      day: 13,
      month: 11,
    });
    expect(localDateParts(instant, "UTC")).toStrictEqual({
      day: 12,
      month: 11,
    });
  });
});
