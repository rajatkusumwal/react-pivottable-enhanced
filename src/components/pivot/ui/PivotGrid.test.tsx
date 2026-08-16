/**
 * Grid feature tests: these cover the Flexmonster-style grid capabilities the
 * comparison table on the home page claims (layouts, subtotals, expand and
 * collapse, spreadsheet headers, repeated labels, selection + auto-calc,
 * keyboard navigation, copy and row windowing).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PivotGrid } from "./PivotGrid";
import { buildLocalResult } from "../engines/local";
import { defaultTheme } from "../types";
import type { PivotRow } from "../types";
import type { PivotLayout, PivotQuery } from "../result";

const data: PivotRow[] = [
  { region: "North", city: "Oslo", category: "Bikes", revenue: 100 },
  { region: "North", city: "Oslo", category: "Clothing", revenue: 200 },
  { region: "North", city: "Bergen", category: "Bikes", revenue: 50 },
  { region: "South", city: "Rome", category: "Bikes", revenue: 300 },
  { region: "South", city: "Rome", category: "Clothing", revenue: 400 },
];

const query = (partial: Partial<PivotQuery> = {}): PivotQuery => ({
  rows: ["region", "city"],
  cols: ["category"],
  values: [{ field: "revenue", aggregator: "sum" }],
  filters: [],
  showSubTotals: true,
  showGrandTotals: true,
  layout: "compact",
  collapsed: [],
  locale: "en",
  ...partial,
});

const renderGrid = (
  q: Partial<PivotQuery> = {},
  props: Partial<React.ComponentProps<typeof PivotGrid>> = {},
) => {
  const built = query(q);
  const result = buildLocalResult(data, built);
  const utils = render(
    <PivotGrid
      result={result}
      layout={built.layout as PivotLayout}
      locale="en"
      theme={defaultTheme}
      {...props}
    />,
  );
  return { ...utils, result };
};

describe("grid layouts", () => {
  it("renders the compact form with one indented row header column", () => {
    renderGrid();
    const grid = screen.getByTestId("pivot-grid");
    const firstBody = within(grid).getByText("North").closest("tr")!;
    expect(firstBody.querySelectorAll("th.pivot-row-header")).toHaveLength(1);
    expect(within(grid).getByText("Oslo")).toBeInTheDocument();
  });

  it("renders the classic form with one column per row field", () => {
    renderGrid({ layout: "classic" });
    const grid = screen.getByTestId("pivot-grid");
    const firstBody = within(grid).getByText("Oslo").closest("tr")!;
    expect(firstBody.querySelectorAll("th.pivot-row-header")).toHaveLength(2);
  });

  it("renders the flat form without subtotal rows", () => {
    renderGrid({ layout: "flat", showSubTotals: false });
    const grid = screen.getByTestId("pivot-grid");
    expect(within(grid).queryByText(/North Total/i)).not.toBeInTheDocument();
  });
});

describe("totals", () => {
  it("shows subtotal rows when subtotals are on", () => {
    const { result } = renderGrid();
    expect(result.rowHeaders.some((h) => h.kind === "subtotal")).toBe(true);
  });

  it("hides subtotal rows when subtotals are off", () => {
    const { result } = renderGrid({ showSubTotals: false });
    expect(result.rowHeaders.some((h) => h.kind === "subtotal")).toBe(false);
  });

  it("shows a grand total row and hides it on request", () => {
    const withTotals = buildLocalResult(data, query());
    expect(withTotals.rowHeaders.some((h) => h.kind === "grand")).toBe(true);
    const without = buildLocalResult(data, query({ showGrandTotals: false }));
    expect(without.rowHeaders.some((h) => h.kind === "grand")).toBe(false);
  });

  it("places the grand total row at the top or the bottom", () => {
    const bottom = buildLocalResult(data, query({ grandTotalsPosition: "bottom" }));
    expect(bottom.rowHeaders.at(-1)?.kind).toBe("grand");

    const top = buildLocalResult(data, query({ layout: "flat", grandTotalsPosition: "top" }));
    expect(top.rowHeaders[0]?.kind).toBe("grand");
    expect(top.rowTotals[0]).toBe(bottom.rowTotals.at(-1));
  });

  it("can hide the row totals column", () => {
    renderGrid({}, { showRowTotals: false });
    const grid = screen.getByTestId("pivot-grid");
    expect(within(grid).queryByTestId("total-0")).not.toBeInTheDocument();
  });
});

describe("expand and collapse", () => {
  it("exposes a collapse control and reports the collapsed path", async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();
    renderGrid({}, { onToggleCollapse });
    await user.click(screen.getByLabelText("Collapse North"));
    expect(onToggleCollapse).toHaveBeenCalledWith(["North"]);
  });

  it("hides children of a collapsed member", () => {
    renderGrid({ collapsed: ["North"] }, { onToggleCollapse: vi.fn() });
    const grid = screen.getByTestId("pivot-grid");
    expect(within(grid).queryByText("Oslo")).not.toBeInTheDocument();
    expect(within(grid).getByLabelText("Expand North")).toBeInTheDocument();
  });
});

describe("header options", () => {
  it("shows spreadsheet-style A/B/C headers when enabled", () => {
    renderGrid({}, { showSpreadsheetHeaders: true });
    const grid = screen.getByTestId("pivot-grid");
    expect(within(grid).getByText("B")).toBeInTheDocument();
    expect(within(grid).getByText("C")).toBeInTheDocument();
  });

  it("repeats member labels in classic form when enabled", () => {
    renderGrid({ layout: "classic" }, { repeatMemberLabels: true });
    const grid = screen.getByTestId("pivot-grid");
    expect(within(grid).getAllByText("North").length).toBeGreaterThan(1);
  });

  it("collapses repeated labels by default", () => {
    renderGrid({ layout: "classic" }, { repeatMemberLabels: false });
    const grid = screen.getByTestId("pivot-grid");
    expect(within(grid).getAllByText("North")).toHaveLength(1);
  });

  it("hides sorting controls when they are switched off", () => {
    renderGrid({}, { showSortingControls: false });
    expect(screen.queryByLabelText("Sort by Bikes")).not.toBeInTheDocument();
  });
});

describe("selection, keyboard and copy", () => {
  it("reports selection statistics for a range", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderGrid({}, { onSelectionChange, allowDrillThrough: false });
    const grid = screen.getByTestId("pivot-grid");
    await user.click(within(grid).getByTestId("cell-0-0"));
    const last = onSelectionChange.mock.calls.at(-1)![0];
    expect(last).toMatchObject({ count: 1 });
  });

  it("moves the selection with the arrow keys", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderGrid({}, { onSelectionChange, allowDrillThrough: false });
    const grid = screen.getByTestId("pivot-grid");
    await user.click(within(grid).getByTestId("cell-0-0"));
    const before = onSelectionChange.mock.calls.length;
    await user.keyboard("{ArrowDown}");
    expect(onSelectionChange.mock.calls.length).toBeGreaterThan(before);
  });

  it("copies the selected cells to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderGrid({}, { allowDrillThrough: false });
    const grid = screen.getByTestId("pivot-grid");
    await user.click(within(grid).getByTestId("cell-0-0"));
    await user.keyboard("{Control>}c{/Control}");
    expect(writeText).toHaveBeenCalled();
  });
});

describe("sorting and drill-through hooks", () => {
  it("cycles sort direction on a column header", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderGrid({}, { onSortChange });
    await user.click(screen.getByLabelText("Sort by Bikes"));
    expect(onSortChange).toHaveBeenCalledWith({ by: 0, direction: "asc" });
  });

  it("asks for drill-through when a cell is clicked", async () => {
    const user = userEvent.setup();
    const onDrill = vi.fn();
    renderGrid({}, { onDrill });
    await user.click(screen.getByTestId("cell-0-0"));
    expect(onDrill).toHaveBeenCalled();
  });
});

describe("large results", () => {
  it("windows the rows instead of rendering every one", () => {
    const many: PivotRow[] = Array.from({ length: 600 }, (_, i) => ({
      region: `R${i}`,
      city: "C",
      category: "Bikes",
      revenue: i,
    }));
    const result = buildLocalResult(many, query({ rows: ["region"], showSubTotals: false }));
    render(
      <PivotGrid result={result} layout="compact" locale="en" theme={defaultTheme} />,
    );
    const rendered = screen.getByTestId("pivot-grid").querySelectorAll("tbody tr");
    expect(result.rowHeaders.length).toBeGreaterThan(500);
    expect(rendered.length).toBeLessThan(result.rowHeaders.length);
  });
});
