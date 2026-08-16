/**
 * Worst case / edge case / best case coverage for the small helpers that the
 * whole grid leans on. Each block states the "best case" (normal data), then
 * the awkward inputs a real dataset throws at us.
 */
import { describe, expect, it } from "vitest";
import { naturalSort } from "./sort";
import { aggregate, aggregators } from "./aggregators";
import { formatNumber, formatPercent } from "./format";
import { applyCellEdit } from "./editing";
import { secureRows, visibleFields, can } from "./security";
import { parseCsv, inferFields } from "./data-sources";
import { detectCsvOptions, parseCsvNumber } from "./csv";
import { shouldOffload, OFFLOAD_ROW_THRESHOLD } from "./engines/large-data";
import type { PivotRow } from "./types";

describe("naturalSort", () => {
  it("orders numbered labels the way a person reads them", () => {
    const members = ["Item 10", "Item 2", "Item 1"];
    expect([...members].sort(naturalSort)).toEqual(["Item 1", "Item 2", "Item 10"]);
  });

  it("compares pure numbers numerically, not as text", () => {
    expect([...["100", "9", "20"]].sort(naturalSort)).toEqual(["9", "20", "100"]);
  });

  it("pushes empty members to the end and treats equals as ties", () => {
    expect([...["B", "", "A", null as unknown as string]].sort(naturalSort)).toEqual([
      "A",
      "B",
      "",
      null,
    ]);
    expect(naturalSort("A", "a")).toBe(0);
  });
});

describe("aggregators with awkward data", () => {
  const rows: PivotRow[] = [
    { v: 10, t: "a" },
    { v: null, t: null },
    { v: "not a number", t: "b" },
    { v: 20, t: "a" },
  ];

  it("ignores non-numeric values instead of producing NaN", () => {
    expect(aggregators["sum"]!(rows, "v")).toBe(30);
    expect(aggregators["average"]!(rows, "v")).toBe(15);
    expect(aggregators["min"]!(rows, "v")).toBe(10);
  });

  it("returns null rather than crashing on empty input", () => {
    for (const name of ["average", "median", "min", "max", "product", "stdDev", "variance"]) {
      expect(aggregators[name]!([], "v")).toBeNull();
    }
    expect(aggregators["sum"]!([], "v")).toBe(0);
    expect(aggregators["count"]!([], "v")).toBe(0);
  });

  it("needs two points before reporting a spread", () => {
    expect(aggregators["variance"]!([{ v: 5 }], "v")).toBeNull();
    expect(aggregators["stdDev"]!([{ v: 5 }], "v")).toBeNull();
    expect(aggregators["variance"]!([{ v: 4 }, { v: 6 }], "v")).toBe(2);
  });

  it("falls back to a sensible aggregator when an unknown name is used", () => {
    expect(aggregate("sum", rows, "v")).toBe(30);
    expect(aggregate("no-such-aggregator", rows, "v")).not.toBeUndefined();
  });
});

describe("number formatting", () => {
  it("formats the common case", () => {
    expect(formatNumber(1234.5, { decimals: 2 }, "en")).toBe("1,234.50");
  });

  it("returns an empty string for missing or infinite values", () => {
    expect(formatNumber(null, undefined, "en")).toBe("");
    expect(formatNumber(Number.POSITIVE_INFINITY, undefined, "en")).toBe("");
    expect(formatPercent(null, "en")).toBe("");
  });

  it("ignores a half-typed currency code instead of throwing", () => {
    expect(() => formatNumber(5, { currency: "U" }, "en")).not.toThrow();
    expect(formatNumber(5, { currency: "USD", decimals: 0 }, "en")).toContain("5");
  });
});

describe("inline editing edge cases", () => {
  const base: PivotRow[] = [
    { country: "France", revenue: 0 },
    { country: "France", revenue: 0 },
  ];
  const request = {
    rowFields: ["country"],
    colFields: [],
    rowKey: ["France"],
    colKey: [],
    field: "revenue",
    aggregator: "sum" as const,
    value: 100,
  };

  it("spreads evenly when the current total is zero", () => {
    const result = applyCellEdit(base, request);
    expect(result.changed).toBe(true);
    expect(result.rows.map((r) => r["revenue"])).toEqual([50, 50]);
  });

  it("refuses counts, non-numbers and cells with no records", () => {
    expect(applyCellEdit(base, { ...request, aggregator: "count" }).changed).toBe(false);
    expect(applyCellEdit(base, { ...request, value: Number.NaN }).changed).toBe(false);
    expect(applyCellEdit(base, { ...request, rowKey: ["Nowhere"] }).reason).toMatch(/No records/);
  });
});

describe("security helpers", () => {
  const rows: PivotRow[] = [
    { country: "France", salary: 100 },
    { country: "Spain", salary: 200 },
  ];

  it("passes everything through when no permissions are set", () => {
    expect(secureRows(rows)).toEqual(rows);
    expect(can(undefined, "export")).toBe(true);
  });

  it("filters rows, drops denied fields and masks sensitive ones", () => {
    const secured = secureRows(rows, {
      rowFilter: (r) => r["country"] === "France",
      maskedFields: ["salary"],
    });
    expect(secured).toEqual([{ country: "France", salary: "••••" }]);
    expect(visibleFields([{ name: "salary", type: "number" }], { deniedFields: ["salary"] })).toEqual(
      [],
    );
  });
});

describe("CSV parsing edge cases", () => {
  it("reads a normal file", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([{ a: 1, b: 2 }]);
  });

  it("survives blank lines, quoted separators and ragged rows", () => {
    const rows = parseCsv('a,b\n"x,y",2\n\n3\n');
    expect(rows[0]).toEqual({ a: "x,y", b: 2 });
    expect(rows).toHaveLength(2);
  });

  it("returns nothing for empty or header-only input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("a,b")).toEqual([]);
    expect(inferFields([])).toEqual([]);
  });

  it("treats unparseable numbers as text rather than NaN", () => {
    expect(parseCsvNumber("")).toBeNull();
    expect(parseCsvNumber("1.2.3")).toBeNull();
    expect(detectCsvOptions("").delimiter).toBeTruthy();
  });
});

describe("large data offload decision", () => {
  it("keeps small datasets in the browser", () => {
    expect(shouldOffload({ rowCount: 10 }).offload).toBe(false);
  });

  it("offloads once the row threshold is crossed", () => {
    expect(shouldOffload({ rowCount: OFFLOAD_ROW_THRESHOLD + 1 }).offload).toBe(true);
  });

  it("handles a missing row count without crashing", () => {
    expect(() => shouldOffload({})).not.toThrow();
  });
});
