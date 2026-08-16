import { describe, expect, it } from "vitest";
import {
  REPORT_PARAM,
  buildReportUrl,
  decodeReport,
  encodeReport,
  readReportFromUrl,
} from "./report-link";
import { createDefaultConfig } from "./types";

const config = createDefaultConfig({
  rows: ["country", "city"],
  cols: ["quarter"],
  values: [{ field: "revenue", aggregator: "sum", format: { decimals: 0, currency: "EUR" } }],
  exportHeader: "Q4 board pack",
  exportFooter: "Confidential",
  conditionalFormats: [
    { field: "revenue", operator: "gt", value: 1000, color: "#0f5132", background: "#d1e7dd" },
  ],
});

describe("share a report by link", () => {
  it("round-trips the whole report through a URL-safe token", () => {
    const token = encodeReport(config);
    expect(token).not.toMatch(/[+/=]/);
    const back = decodeReport(token);
    expect(back?.rows).toEqual(["country", "city"]);
    expect(back?.values[0]?.format?.currency).toBe("EUR");
    expect(back?.conditionalFormats).toHaveLength(1);
    expect(back?.exportHeader).toBe("Q4 board pack");
  });

  it("builds a shareable URL and reads it back", () => {
    const url = buildReportUrl("https://app.example.com/demos?tab=grid", config);
    expect(new URL(url).searchParams.get(REPORT_PARAM)).toBeTruthy();
    expect(new URL(url).searchParams.get("tab")).toBe("grid");
    expect(readReportFromUrl(url)?.cols).toEqual(["quarter"]);
  });

  it("returns null for a missing or corrupt token", () => {
    expect(readReportFromUrl("https://app.example.com/demos")).toBeNull();
    expect(decodeReport("not-a-report")).toBeNull();
  });

  it("fills defaults in for reports saved by an older version", () => {
    const token = encodeReport({ rows: ["country"] } as never);
    const back = decodeReport(token);
    expect(back?.cols).toEqual([]);
    expect(back?.locale).toBeTruthy();
  });
});
