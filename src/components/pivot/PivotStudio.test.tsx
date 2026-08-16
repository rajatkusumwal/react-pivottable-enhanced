import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PivotStudio } from "./PivotStudio";
import { createDefaultConfig } from "./types";
import type { PivotRow } from "./types";

const data: PivotRow[] = [
  { region: "North", category: "Bikes", revenue: 100, cost: 60 },
  { region: "North", category: "Clothing", revenue: 200, cost: 90 },
  { region: "South", category: "Bikes", revenue: 300, cost: 150 },
  { region: "South", category: "Clothing", revenue: 400, cost: 240 },
];

const fields = [
  { name: "region", caption: "Region", type: "string" as const },
  { name: "category", caption: "Category", type: "string" as const },
  { name: "revenue", caption: "Revenue", type: "number" as const },
  { name: "cost", caption: "Cost", type: "number" as const },
];

const baseConfig = createDefaultConfig({
  rows: ["region"],
  cols: ["category"],
  values: [{ field: "revenue", aggregator: "sum" }],
});

const setup = (props: Partial<React.ComponentProps<typeof PivotStudio>> = {}) =>
  render(
    <PivotStudio
      engine="orb"
      data={data}
      fields={fields}
      initialConfig={baseConfig}
      title="Test pivot"
      {...props}
    />,
  );

describe("PivotStudio — Orb.js engine", () => {
  it("renders the pivot grid with totals", async () => {
    setup();
    const grid = await screen.findByTestId("orb-panel");
    expect(within(grid).getByText("North")).toBeInTheDocument();
    expect(within(grid).getByText("South")).toBeInTheDocument();
    expect(within(grid).getAllByText(/Grand total/i).length).toBeGreaterThan(0);
    expect(grid.textContent).toContain("1,000");
  });

  it("opens drill-through with the records behind a cell", async () => {
    const user = userEvent.setup();
    setup();
    const grid = await screen.findByTestId("orb-panel");
    const cell = within(grid).getByText("100.00");
    await user.click(cell);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("drill-through-table")).toBeInTheDocument();
    expect(within(dialog).getByText(/1 records/)).toBeInTheDocument();
  });

  it("applies a filter from the sidebar", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Filter type"), "condition");
    await user.selectOptions(screen.getByLabelText("Filter field"), "revenue");
    await user.selectOptions(screen.getByLabelText("Operator"), "gt");
    const valueInput = screen.getByLabelText("Filter value");
    await user.clear(valueInput);
    await user.type(valueInput, "150");
    await user.click(screen.getByRole("button", { name: /add filter/i }));
    await waitFor(() => expect(screen.getByText(/3 records/)).toBeInTheDocument());
  });

  it("creates a calculated value that can be summarised", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("profit")).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Place profit"), "values");
    const grid = await screen.findByTestId("orb-panel");
    await waitFor(() => expect(grid.textContent).toContain("460.00"));
  });

  it("switches to the chart view", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /chart/i }));
    expect(await screen.findByTestId("pivot-chart")).toBeInTheDocument();
  });

  it("translates the interface", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Language"), "fr");
    expect(await screen.findByText("Lignes")).toBeInTheDocument();
  });

  it("exports the grid", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    setup();
    await screen.findByTestId("orb-panel");
    await user.selectOptions(screen.getByLabelText("Export"), "csv");
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("honours permissions: masking, no export, no drill-through, read only", async () => {
    setup({
      permissions: {
        deniedFields: ["cost"],
        allowExport: false,
        allowDrillThrough: false,
        readOnly: true,
      },
    });
    await screen.findByTestId("orb-panel");
    expect(screen.queryByText("Cost")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Export")).toBeDisabled();
    expect(screen.getByLabelText("Place Region")).toBeDisabled();
  });

  it("supports controlled configuration", async () => {
    const onConfigChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PivotStudio
        engine="orb"
        data={data}
        fields={fields}
        config={baseConfig}
        onConfigChange={onConfigChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /chart/i }));
    expect(onConfigChange).toHaveBeenCalled();
  });
});

describe("PivotStudio — react-pivottable engine", () => {
  it("renders the react-pivottable grid", async () => {
    setup({ engine: "react-pivottable" });
    const panel = await screen.findByTestId("react-pivottable-panel");
    expect(panel.querySelector("table")).toBeTruthy();
    expect(panel.textContent).toContain("North");
    expect(panel.textContent).toContain("Bikes");
  });

  it("drills through from a react-pivottable cell", async () => {
    const user = userEvent.setup();
    setup({ engine: "react-pivottable" });
    const panel = await screen.findByTestId("react-pivottable-panel");
    const cell = panel.querySelector("td.pvtVal") as HTMLElement;
    await user.click(cell);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
