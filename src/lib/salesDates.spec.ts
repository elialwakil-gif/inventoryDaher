import { describe, expect, it } from "vitest";
import { getSaleTimestamp, isSaleOnDate, parseSaleDate } from "./salesDates";

describe("salesDates", () => {
  it("parses ISO dates", () => {
    expect(parseSaleDate("2026-08-17T10:30:00.000Z")).toBeGreaterThan(0);
  });

  it("parses day/month locale dates", () => {
    const timestamp = parseSaleDate("17/08/2026, 13:15:00");
    const date = new Date(timestamp);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(17);
    expect(date.getHours()).toBe(13);
  });

  it("supports time-first locale dates", () => {
    const timestamp = parseSaleDate("13:15:00,17/08/2026");
    const date = new Date(timestamp);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(17);
    expect(date.getHours()).toBe(13);
  });

  it("uses fallback date fields when the primary date is missing", () => {
    const timestamp = getSaleTimestamp({
      createdAt: "2026-08-17T10:30:00.000Z",
    });

    expect(timestamp).toBeGreaterThan(0);
  });

  it("detects sales on the selected local day", () => {
    expect(
      isSaleOnDate({ date: "17/08/2026, 13:15:00" }, new Date(2026, 7, 17, 9)),
    ).toBe(true);

    expect(
      isSaleOnDate({ date: "16/08/2026, 23:59:59" }, new Date(2026, 7, 17, 9)),
    ).toBe(false);
  });
});
