import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { applyDrillSlice, chartDrillKeys, drillColumns } from "./analysis";
import { localDrillThrough } from "./engines/local";
import { createMockPivotApi } from "./engines/mock-api";
import { createBackendEngine } from "./engines/backend";
import { createDefaultConfig } from "./types";
import type { PivotConfig, PivotRow } from "./types";
import { DrillThroughDialog } from "./ui/DrillThroughDialog";
import { locales } from "./locales";
import { PivotStudio } from "./PivotStudio";

const strings = locales["en"]!.strings;

const rows: PivotRow[] = [
  { region: "West", country: "USA", year: "2024", revenue: 100, rep: "Ann" },
  { region: "West", country: "USA", year: "2025", revenue: 50, rep: "Bob" },
  { region: "West", country: "Canada", year: "2024", revenue: 25, rep: "Cid" },
  { region: "East", country: "France", year: "2024", revenue: 40, rep: "Dee" },
  { region: "East", country: "Spain", year: "2025", revenue: 60, rep: "Eli" },
];

const fields = [
  { name: "region", type: "string" as const },
  { name: "country", type: "string" as const },
  { name: "year", type: "string" as const },
  { name: "rep", type: "string" as const },
  { name: "revenue", type: "number" as const },
];

function cfg(patch: Partial<PivotConfig> = {}): PivotConfig {
  return createDefaultConfig({
    rows: ["region", "country"],
    cols: ["year"],
    values: [{ field: "revenue", aggregator: "sum" }],
    ...patch,
  });
}

const query = (c: PivotConfig) => ({
  rows: c.rows,
  cols: c.cols,
  values: c.values,
  filters: c.filters,
  calculated: c.calculated,
  showSubTotals: c.showSubTotals,
  showGrandTotals: c.showGrandTotals,
  layout: c.layout,
  collapsed: c.collapsed,
  locale: c.locale,
});

describe("drill-through slice", () => {
  it("lists every column present in the records", () => {
    expect(drillColumns(rows)).toEqual(["region", "country", "year", "revenue", "rep"]);
  });

  it("projects only the configured columns, in order", () => {
    const out = applyDrillSlice(rows, { fields: ["rep", "revenue"] });
    expect(Object.keys(out[0]!)).toEqual(["rep", "revenue"]);
  });

  it("sorts numbers and strings in both directions", () => {
    expect(applyDrillSlice(rows, { sort: { field: "revenue", dir: "desc" } })[0]!["revenue"]).toBe(
      100,
    );
    expect(applyDrillSlice(rows, { sort: { field: "rep", dir: "asc" } })[0]!["rep"]).toBe("Ann");
    expect(applyDrillSlice(rows, { sort: { field: "rep", dir: "desc" } })[0]!["rep"]).toBe("Eli");
  });

  it("caps the number of rows", () => {
    expect(applyDrillSlice(rows, { maxRows: 2 })).toHaveLength(2);
    expect(applyDrillSlice(rows, { maxRows: 99 })).toHaveLength(5);
  });

  it("applies sort before the cap so the cap keeps the top records", () => {
    const out = applyDrillSlice(rows, { sort: { field: "revenue", dir: "desc" }, maxRows: 2 });
    expect(out.map((r) => r["revenue"])).toEqual([100, 60]);
  });
});

describe("engine contract", () => {
  it("filters by the row and column keys and honours the slice", () => {
    const c = cfg();
    const out = localDrillThrough(rows, {
      rowKey: ["West"],
      colKey: ["2024"],
      query: query(c),
      fields: ["rep", "revenue"],
      sort: { field: "revenue", dir: "desc" },
      limit: 1,
    });
    expect(out).toEqual([{ rep: "Ann", revenue: 100 }]);
  });

  it("returns empty objects when fields are deselected", () => {
    const c = cfg();
    const out = localDrillThrough(rows, {
      rowKey: ["West"],
      colKey: ["2024"],
      query: query(c),
      fields: [],
    });
    expect(out.length).toBe(2);
    expect(out[0]).toEqual({});
    expect(out[1]).toEqual({});
  });

  it("includes every source field when fields are omitted", () => {
    const c = cfg();
    const out = localDrillThrough(rows, {
      rowKey: ["West"],
      colKey: ["2024"],
      query: query(c),
    });
    expect(Object.keys(out[0]!).sort()).toEqual(["country", "region", "rep", "revenue", "year"]);
  });

  it("returns the slice and the uncapped total over the REST contract", async () => {
    const api = createMockPivotApi({ rows });
    const fetchSpy = vi.fn(api.fetch);
    const engine = createBackendEngine({ baseUrl: "https://pivot.test/api", fetchImpl: fetchSpy });
    const c = cfg();
    const out = await engine.drillThrough(
      { rowKey: ["West"], colKey: [], query: query(c), limit: 2, fields: ["rep"] },
      rows,
    );
    expect(out).toEqual([{ rep: "Ann" }, { rep: "Bob" }]);

    const res = await api.fetch("https://pivot.test/api/drillthrough", {
      method: "POST",
      body: JSON.stringify({ rowKey: ["West"], colKey: [], query: query(c), limit: 2 }),
    });
    expect((await res.json()).total).toBe(3);
  });
});

describe("drill-through from charts", () => {
  it("turns a chart click into row and column keys", () => {
    const keys = chartDrillKeys(
      { categoryPath: [], seriesPath: [], categoryField: "region", seriesField: "year" },
      "West",
      "2024",
    );
    expect(keys).toEqual({ rowKey: ["West"], colKey: ["2024"], label: "West · 2024" });
  });

  it("keeps the drill path from the axis and legend", () => {
    const keys = chartDrillKeys(
      {
        categoryPath: ["West"],
        seriesPath: ["2024"],
        categoryField: "country",
        seriesField: "quarter",
      },
      "USA",
      "Q1",
    );
    expect(keys.rowKey).toEqual(["West", "USA"]);
    expect(keys.colKey).toEqual(["2024", "Q1"]);
  });

  it("keeps the column key empty when the report has no column fields", () => {
    const keys = chartDrillKeys(
      { categoryPath: [], seriesPath: [], categoryField: "region" },
      "West",
      "Revenue",
    );
    expect(keys.colKey).toEqual([]);
  });

  it("opens the records behind a chart bar", async () => {
    render(
      <PivotStudio
        data={rows}
        fields={fields}
        config={cfg({ chart: { visible: true, type: "bar", position: "bottom" } })}
      />,
    );
    const drill = await screen.findByTestId("chart-drill-East-2024");
    fireEvent.click(drill);
    await waitFor(() => expect(screen.getByTestId("drill-through-table")).toBeTruthy());
  });
});

describe("drill-through dialog", () => {
  const open = (props: Partial<React.ComponentProps<typeof DrillThroughDialog>> = {}) =>
    render(
      <DrillThroughDialog
        open
        title="West"
        rows={rows}
        strings={strings}
        onClose={() => undefined}
        {...props}
      />,
    );

  it("sorts a column by clicking its header", () => {
    open();
    fireEvent.click(screen.getByLabelText("Sort by revenue"));
    const first = within(screen.getByTestId("drill-through-table")).getAllByRole("row")[1]!;
    expect(first.textContent).toContain("25");
    fireEvent.click(screen.getByLabelText("Sort by revenue"));
    const desc = within(screen.getByTestId("drill-through-table")).getAllByRole("row")[1]!;
    expect(desc.textContent).toContain("100");
  });

  it("reports the sort change to the host", () => {
    const onSortChange = vi.fn();
    open({ onSortChange });
    fireEvent.click(screen.getByLabelText("Sort by rep"));
    expect(onSortChange).toHaveBeenCalledWith({ field: "rep", dir: "asc" });
  });

  it("shows only the configured slice columns", () => {
    open({ fields: ["rep", "revenue"] });
    const header = within(screen.getByTestId("drill-through-table")).getAllByRole("row")[0]!;
    expect(header.textContent).toBe("reprevenue");
  });

  it("hides a column from the built-in field list", () => {
    const onFieldsChange = vi.fn();
    open({ onFieldsChange });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const list = screen.getByLabelText("Drill-through field list");
    fireEvent.click(within(list).getByLabelText("rep"));
    expect(onFieldsChange).toHaveBeenCalledWith(["region", "country", "year", "revenue"]);
  });

  it("selects all columns in the drill-through field list", () => {
    const onFieldsChange = vi.fn();
    open({ onFieldsChange, fields: ["rep", "revenue"] });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const list = screen.getByLabelText("Drill-through field list");
    fireEvent.click(within(list).getByRole("button", { name: "Select all" }));
    expect(onFieldsChange).toHaveBeenCalledWith(undefined);
  });

  it("deselects all columns in the drill-through field list", () => {
    const onFieldsChange = vi.fn();
    open({ onFieldsChange });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const list = screen.getByLabelText("Drill-through field list");
    fireEvent.click(within(list).getByRole("button", { name: "Deselect all" }));
    expect(onFieldsChange).toHaveBeenCalledWith([]);
  });

  it("shows the full table again after selecting all", () => {
    function Wrapper() {
      const [fields, setFields] = useState<string[] | undefined>(["rep"]);
      return (
        <DrillThroughDialog
          open
          title="West"
          rows={rows}
          strings={strings}
          fields={fields}
          onFieldsChange={setFields}
          onClose={() => undefined}
        />
      );
    }
    render(<Wrapper />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const list = screen.getByLabelText("Drill-through field list");
    fireEvent.click(within(list).getByRole("button", { name: "Select all" }));
    const header = within(screen.getByTestId("drill-through-table")).getAllByRole("row")[0]!;
    expect(header.textContent).toBe("regioncountryyearrevenuerep");
  });

  it("keeps the dialog and column list open after deselecting all", () => {
    function Wrapper() {
      const [fields, setFields] = useState<string[] | undefined>(undefined);
      return (
        <DrillThroughDialog
          open
          title="West"
          rows={rows}
          strings={strings}
          fields={fields}
          onFieldsChange={setFields}
          onClose={() => undefined}
        />
      );
    }
    render(<Wrapper />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const list = screen.getByLabelText("Drill-through field list");
    fireEvent.click(within(list).getByRole("button", { name: "Deselect all" }));
    expect(screen.getByRole("dialog", { name: strings.drillThrough })).toBeTruthy();
    expect(screen.getByLabelText("Drill-through field list")).toBeTruthy();
    expect(screen.getByTestId("drill-through-no-columns").textContent).toContain(
      "No columns selected",
    );
    expect(screen.queryByTestId("drill-through-table")).toBeNull();
  });
  it("searches inside the drill-through field list", () => {
    open({ onFieldsChange: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.change(screen.getByLabelText("Search drill-through fields"), {
      target: { value: "rev" },
    });
    const list = screen.getByLabelText("Drill-through field list");
    expect(within(list).queryByLabelText("region")).toBeNull();
    expect(within(list).getByLabelText("revenue")).toBeTruthy();
  });

  it("announces the record cap and the column count", () => {
    open({ rows: rows.slice(0, 2), maxRows: 2, total: 5 });
    expect(screen.getByText(/limited to 2/)).toBeTruthy();
    expect(screen.getByText(/5 of 5 columns/)).toBeTruthy();
  });
});
