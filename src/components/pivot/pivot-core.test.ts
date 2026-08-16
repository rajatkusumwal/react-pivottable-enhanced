import { describe, expect, it } from "vitest";
import { areaOfField, moveField, removeField, reorderField } from "./dnd";
import { aggregate, registerAggregator } from "./aggregators";
import { applyFilters, describeFilter, matchesCondition, uniqueMembers } from "./filters";
import { applyCalculatedFields, evaluateFormula, validateFormula } from "./calculated";
import { buildChartData, drillThroughRows, applyDisplayMode } from "./analysis";
import { matrixFromTable, toCsv, toHtml, toTsv } from "./export";
import { secureRows, visibleFields, can } from "./security";
import { inferFields, parseCsv } from "./data-sources";
import { formatNumber } from "./format";
import { getLocale, locales } from "./locales";
import { createDefaultConfig } from "./types";
import { sampleCsv, sampleData, sampleFields, generateSalesData } from "./sample-data";
import type { PivotRow } from "./types";

const rows: PivotRow[] = [
  { region: "North", category: "Bikes", revenue: 100, cost: 60 },
  { region: "North", category: "Clothing", revenue: 200, cost: 90 },
  { region: "South", category: "Bikes", revenue: 300, cost: 150 },
  { region: "South", category: "Clothing", revenue: 400, cost: 240 },
];

describe("aggregations", () => {
  it("computes the built-in functions", () => {
    expect(aggregate("sum", rows, "revenue")).toBe(1000);
    expect(aggregate("count", rows, "revenue")).toBe(4);
    expect(aggregate("average", rows, "revenue")).toBe(250);
    expect(aggregate("min", rows, "revenue")).toBe(100);
    expect(aggregate("max", rows, "revenue")).toBe(400);
    expect(aggregate("median", rows, "revenue")).toBe(250);
    expect(aggregate("distinctCount", rows, "region")).toBe(2);
    expect(aggregate("product", rows, "revenue")).toBe(100 * 200 * 300 * 400);
    expect(aggregate("stdDev", rows, "revenue")).toBeCloseTo(129.099, 2);
    expect(aggregate("variance", rows, "revenue")).toBeCloseTo(16666.67, 1);
    expect(aggregate("first", rows, "revenue")).toBe(100);
    expect(aggregate("last", rows, "revenue")).toBe(400);
  });

  it("supports custom aggregations", () => {
    registerAggregator("margin", (r) => {
      const rev = r.reduce((a, x) => a + Number(x["revenue"] ?? 0), 0);
      const cost = r.reduce((a, x) => a + Number(x["cost"] ?? 0), 0);
      return rev ? ((rev - cost) / rev) * 100 : null;
    }, "Margin %");
    expect(aggregate("margin", rows, "revenue")).toBeCloseTo(46, 0);
  });
});

describe("filters", () => {
  it("keeps or excludes chosen values", () => {
    expect(
      applyFilters(rows, [{ kind: "values", field: "region", mode: "include", members: ["North"] }]),
    ).toHaveLength(2);
    expect(
      applyFilters(rows, [{ kind: "values", field: "region", mode: "exclude", members: ["North"] }]),
    ).toHaveLength(2);
  });

  it("applies conditional filters", () => {
    expect(
      applyFilters(rows, [{ kind: "condition", field: "revenue", operator: "gt", value: 150 }]),
    ).toHaveLength(3);
    expect(matchesCondition("Bikes", "beginsWith", "bi")).toBe(true);
    expect(matchesCondition(250, "between", 100, 300)).toBe(true);
    expect(matchesCondition("Bikes", "notContains", "cloth")).toBe(true);
  });

  it("compares date fields with the date operators", () => {
    const d = (raw: unknown, op: Parameters<typeof matchesCondition>[1], v: string, v2?: string) =>
      matchesCondition(raw as never, op, v, v2, "date");
    expect(d("2024-03-01", "gt", "2024-02-01")).toBe(true);
    expect(d("2024-03-01", "gt", "2024-03-01")).toBe(false);
    expect(d("2024-03-01", "gte", "2024-03-01")).toBe(true);
    expect(d("2024-01-15", "lt", "2024-02-01")).toBe(true);
    expect(d("2024-02-01", "lte", "2024-02-01")).toBe(true);
    expect(d("2024-02-01", "eq", "2024-02-01")).toBe(true);
    expect(d("2024-02-01", "neq", "2024-02-02")).toBe(true);
    expect(d("2024-02-10", "between", "2024-02-01", "2024-02-28")).toBe(true);
    expect(d("2024-03-10", "between", "2024-02-01", "2024-02-28")).toBe(false);
  });

  it("matches timestamps at day granularity and rejects invalid dates", () => {
    expect(matchesCondition("2024-02-01T18:45:00Z", "eq", "2024-02-01", undefined, "date")).toBe(
      true,
    );
    expect(matchesCondition("not-a-date", "gt", "2024-01-01", undefined, "date")).toBe(false);
    expect(matchesCondition("2024-01-02", "gt", "nope", undefined, "date")).toBe(false);
  });

  it("infers dates automatically and keeps numeric behaviour otherwise", () => {
    expect(matchesCondition("2024-03-01", "gt", "2024-02-01")).toBe(true);
    expect(matchesCondition(250, "gt", 100, undefined, "auto")).toBe(true);
    // Forcing number mode on ISO strings falls back to NaN comparisons.
    expect(matchesCondition("2024-03-01", "gt", "2024-02-01", undefined, "number")).toBe(false);
  });

  it("filters rows by a date range", () => {
    const dated: PivotRow[] = [
      { orderDate: "2024-01-05", revenue: 10 },
      { orderDate: "2024-02-20", revenue: 20 },
      { orderDate: "2024-03-30", revenue: 30 },
    ];
    expect(
      applyFilters(dated, [
        {
          kind: "condition",
          field: "orderDate",
          operator: "between",
          value: "2024-02-01",
          value2: "2024-03-01",
          valueType: "date",
        },
      ]),
    ).toHaveLength(1);
    expect(
      applyFilters(dated, [
        {
          kind: "condition",
          field: "orderDate",
          operator: "gte",
          value: "2024-02-20",
          valueType: "date",
        },
      ]),
    ).toHaveLength(2);
  });

  it("describes date conditions in plain English", () => {
    expect(
      describeFilter({
        kind: "condition",
        field: "orderDate",
        operator: "lt",
        value: "2024-02-01",
        valueType: "date",
      }),
    ).toBe("orderDate is before 2024-02-01");
  });

  it("applies top-N filters", () => {
    const top = applyFilters(rows, [
      { kind: "top", field: "region", measure: "revenue", aggregator: "sum", direction: "top", count: 1 },
    ]);
    expect(new Set(top.map((r) => r["region"]))).toEqual(new Set(["South"]));
  });

  it("lists unique members for the filter UI", () => {
    expect(uniqueMembers(rows, "region")).toEqual(["North", "South"]);
  });
});

describe("calculated values", () => {
  it("evaluates formulas safely", () => {
    expect(evaluateFormula("[revenue] - [cost]", rows[0] as PivotRow)).toBe(40);
    expect(evaluateFormula("([revenue] - [cost]) / [revenue] * 100", rows[0] as PivotRow)).toBeCloseTo(40);
    expect(validateFormula("[revenue] +")).not.toBeNull();
  });

  it("adds calculated columns to every row", () => {
    const out = applyCalculatedFields(rows, [{ name: "profit", formula: "[revenue] - [cost]" }]);
    expect(out.map((r) => r["profit"])).toEqual([40, 110, 150, 160]);
  });
});

describe("charts, drill-through and display modes", () => {
  const config = createDefaultConfig({
    rows: ["region"],
    cols: ["category"],
    values: [{ field: "revenue", aggregator: "sum" }],
  });

  it("builds chart series from rows and columns", () => {
    const { data, series } = buildChartData(rows, config);
    expect(series).toEqual(["Bikes", "Clothing"]);
    expect(data).toEqual([
      { name: "North", Bikes: 100, Clothing: 200 },
      { name: "South", Bikes: 300, Clothing: 400 },
    ]);
  });

  it("returns the records behind a cell", () => {
    const records = drillThroughRows(rows, {
      rowField: "region",
      rowValue: "North",
      colField: "category",
      colValue: "Bikes",
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.["revenue"]).toBe(100);
  });

  it("converts values with the display modes", () => {
    const ctx = { grand: 1000, rowTotal: 300, colTotal: 400, running: 250 };
    expect(applyDisplayMode(100, ctx, "percentOfGrandTotal")).toBe(10);
    expect(applyDisplayMode(100, ctx, "percentOfRowTotal")).toBeCloseTo(33.33, 1);
    expect(applyDisplayMode(100, ctx, "percentOfColumnTotal")).toBe(25);
    expect(applyDisplayMode(100, ctx, "runningTotal")).toBe(250);
    expect(applyDisplayMode(100, ctx, "raw")).toBe(100);
  });
});

describe("export & print", () => {
  it("turns a rendered table into csv, tsv and html", () => {
    document.body.innerHTML = `<table><thead><tr><th>Region</th><th>Revenue</th></tr></thead>
      <tbody><tr><td>North, NA</td><td>300</td></tr></tbody></table>`;
    const table = document.querySelector("table") as HTMLTableElement;
    const matrix = matrixFromTable(table, "Sales");
    expect(matrix.head[0]).toEqual(["Region", "Revenue"]);
    expect(toCsv(matrix)).toContain('"North, NA"');
    expect(toTsv(matrix)).toContain("North, NA\t300");
    expect(toHtml(matrix)).toContain("<th>Region</th>");
  });
});

describe("security", () => {
  it("hides denied fields, masks sensitive ones and filters rows", () => {
    const secured = secureRows(rows, {
      deniedFields: ["cost"],
      maskedFields: ["revenue"],
      rowFilter: (r) => r["region"] === "North",
    });
    expect(secured).toHaveLength(2);
    expect(secured[0]).not.toHaveProperty("cost");
    expect(secured[0]?.["revenue"]).toBe("••••");
  });

  it("filters the field list and reports permissions", () => {
    expect(visibleFields(sampleFields, { deniedFields: ["cost"] }).some((f) => f.name === "cost")).toBe(false);
    expect(can({ allowExport: false }, "export")).toBe(false);
    expect(can({ readOnly: true }, "edit")).toBe(false);
    expect(can(undefined, "drillThrough")).toBe(true);
  });
});

describe("data sources", () => {
  it("parses csv and infers field types", () => {
    const parsed = parseCsv(sampleCsv);
    expect(parsed).toHaveLength(4);
    expect(parsed[0]?.["revenue"]).toBe(1200);
    const fields = inferFields(parsed);
    expect(fields.find((f) => f.name === "revenue")?.type).toBe("number");
    expect(fields.find((f) => f.name === "region")?.type).toBe("string");
  });

  it("handles quoted csv values", () => {
    expect(parseCsv('a,b\n"x,1",2')[0]).toEqual({ a: "x,1", b: 2 });
  });
});

describe("formatting & localisation", () => {
  it("formats numbers per locale", () => {
    expect(formatNumber(1234.5, { decimals: 2 }, "en")).toBe("1,234.50");
    expect(formatNumber(1234.5, { decimals: 0, currency: "USD" }, "en")).toBe("$1,235");
    expect(formatNumber(null, {}, "en")).toBe("");
  });

  it("ships translated strings", () => {
    expect(Object.keys(locales)).toEqual(expect.arrayContaining(["en", "fr", "de", "es", "ja"]));
    expect(getLocale("fr").strings.rows).toBe("Lignes");
    expect(getLocale("zz").strings.rows).toBe("Rows");
  });
});

describe("sample data", () => {
  it("is deterministic", () => {
    expect(sampleData).toHaveLength(600);
    expect(Object.keys(sampleData[0]!).length).toBeGreaterThanOrEqual(50);
    expect(generateSalesData(10, 1)).toEqual(generateSalesData(10, 1));
  });
});

describe("field drag & drop helpers", () => {
  const cfg = createDefaultConfig({
    rows: ["region"],
    cols: ["category"],
    values: [{ field: "revenue", aggregator: "sum" }],
  });

  it("reports the area a field lives in", () => {
    expect(areaOfField(cfg, "region")).toBe("rows");
    expect(areaOfField(cfg, "category")).toBe("cols");
    expect(areaOfField(cfg, "revenue")).toBe("values");
    expect(areaOfField(cfg, "cost")).toBe("fields");
  });

  it("moves a field between areas without duplicating it", () => {
    const patch = moveField(cfg, "region", "cols", 0);
    expect(patch.rows).toEqual([]);
    expect(patch.cols).toEqual(["region", "category"]);
  });

  it("defaults numbers to sum when dropped on measures", () => {
    const patch = moveField(cfg, "cost", "values", undefined, "number");
    expect(patch.values?.at(-1)).toMatchObject({ field: "cost", aggregator: "sum" });
  });

  it("creates an all-members filter when dropped on report filters", () => {
    const patch = moveField(cfg, "region", "filters");
    expect(patch.filters?.[0]).toMatchObject({ kind: "values", field: "region", members: [] });
  });

  it("removes a field and reorders within an area", () => {
    expect(removeField(cfg, "region").rows).toEqual([]);
    const two = { ...cfg, rows: ["region", "category"] };
    expect(reorderField(two, "rows", 0, 1).rows).toEqual(["category", "region"]);
  });

  it("treats an empty include filter as keep everything", () => {
    const rows = [{ region: "North" }, { region: "South" }];
    expect(
      applyFilters(rows, [{ kind: "values", field: "region", mode: "include", members: [] }]),
    ).toHaveLength(2);
  });
});
