import { describe, expect, it } from "vitest";

import { formatDate, formatDuration, formatEur, formatHours, formatMonth, formatNumber, formatPercent } from "./format";

describe("formatDuration", () => {
  it("renders minutes under an hour", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(42 * 60_000)).toBe("42 min");
  });

  it("renders hours and minutes", () => {
    expect(formatDuration(90 * 60_000)).toBe("1 h 30 min");
  });

  it("drops minutes at 100+ hours and groups thousands", () => {
    expect(formatDuration(100 * 3_600_000)).toBe("100 h");
    expect(formatDuration(1234 * 3_600_000)).toBe("1,234 h");
  });
});

describe("formatHours", () => {
  it("keeps one decimal under 100 h", () => {
    expect(formatHours(5.25 * 3_600_000)).toBe("5.3 h");
    expect(formatHours(2 * 3_600_000)).toBe("2 h");
  });

  it("rounds at 100+ h", () => {
    expect(formatHours(812.6 * 3_600_000)).toBe("813 h");
  });
});

describe("formatEur", () => {
  it("formats euro amounts", () => {
    expect(formatEur(9.3)).toBe("€9.30");
    expect(formatEur(-9.3)).toBe("-€9.30");
  });
});

describe("formatDate", () => {
  it("formats date-only strings without timezone drift", () => {
    expect(formatDate("2026-04-22")).toBe("Apr 22, 2026");
  });

  it("formats ISO datetimes and epoch ms", () => {
    expect(formatDate("2026-02-23T03:31:54Z")).toBe("Feb 23, 2026");
    expect(formatDate(Date.UTC(2021, 3, 30))).toBe("Apr 30, 2021");
  });

  it("falls back to an em dash for empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("Not Available")).toBe("—");
  });
});

describe("formatMonth", () => {
  it("formats YYYY-MM", () => {
    expect(formatMonth("2026-04")).toBe("Apr 2026");
  });
});

describe("formatNumber / formatPercent", () => {
  it("groups thousands and rounds percentages", () => {
    expect(formatNumber(34608)).toBe("34,608");
    expect(formatPercent(0.873)).toBe("87%");
  });
});
