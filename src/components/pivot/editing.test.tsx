import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PivotStudio } from "./PivotStudio";
import { createDefaultConfig } from "./types";
import type { PivotRow } from "./types";
import { applyCellEdit, isEditableAggregator, matchingIndexes } from "./editing";

const data: PivotRow[] = [
  { region: "North", category: "Bikes", revenue: 100 },
  { region: "North", category: "Bikes", revenue: 300 },
  { region: "South", category: "Bikes", revenue: 50 },
];

const base = {
  rowFields: ["region"],
  colFields: ["category"],
  rowKey: ["North"],
  colKey: ["Bikes"],
  field: "revenue",
};

describe("applyCellEdit", () => {
  it("finds the records behind a cell", () => {
    expect(matchingIndexes(data, { ...base, aggregator: "sum", value: 1 })).toEqual([0, 1]);
  });

  it("spreads a sum edit proportionally across the contributing records", () => {
    const out = applyCellEdit(data, { ...base, aggregator: "sum", value: 800 });
    expect(out.changed).toBe(true);
    expect(out.rows[0]!["revenue"]).toBe(200);
    expect(out.rows[1]!["revenue"]).toBe(600);
    expect(out.rows[2]!["revenue"]).toBe(50);
  });

  it("splits evenly when the current sum is zero", () => {
    const zeros: PivotRow[] = [
      { region: "North", category: "Bikes", revenue: 0 },
      { region: "North", category: "Bikes", revenue: 0 },
    ];
    const out = applyCellEdit(zeros, { ...base, aggregator: "sum", value: 10 });
    expect(out.rows.map((r) => r["revenue"])).toEqual([5, 5]);
  });

  it("sets every contributing record for non-sum aggregators", () => {
    const out = applyCellEdit(data, { ...base, aggregator: "average", value: 7 });
    expect(out.rows.slice(0, 2).map((r) => r["revenue"])).toEqual([7, 7]);
  });

  it("refuses count based cells", () => {
    expect(isEditableAggregator("count")).toBe(false);
    const out = applyCellEdit(data, { ...base, aggregator: "count", value: 5 });
    expect(out.changed).toBe(false);
    expect(out.rows).toBe(data);
  });

  it("refuses non-numeric input and unmatched cells", () => {
    expect(applyCellEdit(data, { ...base, aggregator: "sum", value: NaN }).changed).toBe(false);
    expect(
      applyCellEdit(data, { ...base, aggregator: "sum", rowKey: ["West"], value: 5 }).changed,
    ).toBe(false);
  });

  it("does not mutate the input rows", () => {
    applyCellEdit(data, { ...base, aggregator: "sum", value: 800 });
    expect(data[0]!["revenue"]).toBe(100);
  });
});

const fields = [
  { name: "region", caption: "Region", type: "string" as const },
  { name: "category", caption: "Category", type: "string" as const },
  { name: "revenue", caption: "Revenue", type: "number" as const },
];

const renderStudio = (onDataChange?: (rows: PivotRow[]) => void) =>
  render(
    <PivotStudio
      data={data}
      fields={fields}
      title="Editable pivot"
      fieldsUi="sidebar"
      showSidebar={false}
      {...(onDataChange ? { onDataChange } : {})}
      initialConfig={createDefaultConfig({
        rows: ["region"],
        cols: ["category"],
        values: [{ field: "revenue", aggregator: "sum" }],
      })}
    />,
  );

describe("inline cell editing in the grid", () => {
  it("is off until the toolbar switch is turned on", async () => {
    const user = userEvent.setup();
    renderStudio();
    await screen.findByTestId("pivot-grid");
    await user.dblClick(screen.getByTestId("cell-0-0"));
    expect(screen.queryByRole("spinbutton")).toBeNull();

    await user.click(screen.getByLabelText("Edit cells"));
    await user.dblClick(screen.getByTestId("cell-0-0"));
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("writes the typed value back and recomputes totals", async () => {
    const user = userEvent.setup();
    const onDataChange = vi.fn();
    renderStudio(onDataChange);
    await screen.findByTestId("pivot-grid");
    await user.click(screen.getByLabelText("Edit cells"));
    await user.dblClick(screen.getByTestId("cell-0-0"));

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "800{Enter}");

    await waitFor(() => expect(screen.getByTestId("cell-0-0")).toHaveTextContent("800"));
    expect(onDataChange).toHaveBeenCalled();
    const rows = onDataChange.mock.calls.at(-1)![0] as PivotRow[];
    expect(rows[0]!["revenue"]).toBe(200);
    expect(rows[1]!["revenue"]).toBe(600);
  });

  it("cancels on Escape without changing the value", async () => {
    const user = userEvent.setup();
    renderStudio();
    await screen.findByTestId("pivot-grid");
    await user.click(screen.getByLabelText("Edit cells"));
    await user.dblClick(screen.getByTestId("cell-0-0"));
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "999{Escape}");
    await waitFor(() => expect(screen.queryByRole("spinbutton")).toBeNull());
    expect(screen.getByTestId("cell-0-0")).toHaveTextContent("400");
  });

  it("keeps grand total rows read only", async () => {
    const user = userEvent.setup();
    renderStudio();
    await screen.findByTestId("pivot-grid");
    await user.click(screen.getByLabelText("Edit cells"));
    const grandRowIndex = 2; // North, South, Grand total
    await user.dblClick(screen.getByTestId(`cell-${grandRowIndex}-0`));
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });
});
