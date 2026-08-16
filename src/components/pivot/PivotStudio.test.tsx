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
      data={data}
      fields={fields}
      initialConfig={baseConfig}
      title="Test pivot"
      fieldsUi="sidebar"
      {...props}
    />,
  );

describe("PivotStudio multilevel drill", () => {
  const nested: PivotRow[] = [
    { region: "North", city: "Oslo", category: "Bikes", revenue: 100 },
    { region: "North", city: "Bergen", category: "Bikes", revenue: 50 },
    { region: "South", city: "Rome", category: "Bikes", revenue: 300 },
  ];
  const nestedFields = [
    { name: "region", caption: "Region", type: "string" as const },
    { name: "city", caption: "City", type: "string" as const },
    { name: "category", caption: "Category", type: "string" as const },
    { name: "revenue", caption: "Revenue", type: "number" as const },
  ];
  const nestedConfig = createDefaultConfig({
    rows: ["region", "city"],
    cols: ["category"],
    values: [{ field: "revenue", aggregator: "sum" }],
  });

  const renderNested = () =>
    render(
      <PivotStudio
        data={nested}
        fields={nestedFields}
        initialConfig={nestedConfig}
        title="Nested pivot"
        fieldsUi="sidebar"
      />,
    );

  it("drills up to the top level and back down again", async () => {
    const user = userEvent.setup();
    renderNested();
    const grid = await screen.findByTestId("pivot-grid");
    expect(within(grid).getByText("Oslo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Drill up to top level" }));
    await waitFor(() =>
      expect(within(screen.getByTestId("pivot-grid")).queryByText("Oslo")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Drill down all levels" }));
    await waitFor(() =>
      expect(within(screen.getByTestId("pivot-grid")).getByText("Oslo")).toBeInTheDocument(),
    );
  });
});

describe("PivotStudio grid", () => {
  it("renders row members, column members and totals", async () => {
    setup();
    const grid = await screen.findByTestId("pivot-grid");
    expect(within(grid).getByText("North")).toBeInTheDocument();
    expect(within(grid).getByText("South")).toBeInTheDocument();
    expect(within(grid).getByText("Bikes")).toBeInTheDocument();
    await waitFor(() => expect(grid.textContent).toContain("1,000"));
  });

  it("opens drill-through with the records behind a cell", async () => {
    const user = userEvent.setup();
    setup();
    const grid = await screen.findByTestId("pivot-grid");
    await user.click(within(grid).getByTestId("cell-0-0"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("drill-through-table")).toBeInTheDocument();
    expect(within(dialog).getByText(/1 records/)).toBeInTheDocument();
  });

  it("sorts by a column when the sort control is used", async () => {
    const user = userEvent.setup();
    setup();
    const grid = await screen.findByTestId("pivot-grid");
    await user.click(within(grid).getByRole("button", { name: /sort by bikes/i }));
    await waitFor(() => {
      const first = screen.getByTestId("pivot-grid").querySelector("tbody tr th");
      expect(first?.textContent).toContain("North");
    });
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

  it("offers date operators and filters by a date condition", async () => {
    const user = userEvent.setup();
    setup({
      data: [
        { region: "North", category: "Bikes", orderDate: "2024-01-05", revenue: 100 },
        { region: "North", category: "Clothing", orderDate: "2024-02-10", revenue: 200 },
        { region: "South", category: "Bikes", orderDate: "2024-03-20", revenue: 300 },
      ],
      fields: [
        { name: "region", caption: "Region", type: "string" as const },
        { name: "category", caption: "Category", type: "string" as const },
        { name: "orderDate", caption: "Order date", type: "date" as const },
        { name: "revenue", caption: "Revenue", type: "number" as const },
      ],
    });
    await user.selectOptions(screen.getByLabelText("Filter type"), "condition");
    await user.selectOptions(screen.getByLabelText("Filter field"), "orderDate");
    const operator = screen.getByLabelText("Operator") as HTMLSelectElement;
    expect(
      Array.from(operator.options).map((o) => o.textContent),
    ).toContain("is on or after");
    const valueInput = screen.getByLabelText("Filter value") as HTMLInputElement;
    expect(valueInput.type).toBe("date");
    await user.selectOptions(operator, "gte");
    await user.clear(valueInput);
    await user.type(valueInput, "2024-02-01");
    await user.click(screen.getByRole("button", { name: /add filter/i }));
    await waitFor(() => expect(screen.getByText(/2 records/)).toBeInTheDocument());
  });

  it("creates a calculated value that can be summarised", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getAllByText("profit").length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: "Remove Revenue" }));
    await user.selectOptions(screen.getByLabelText("Place profit"), "values");
    const grid = await screen.findByTestId("pivot-grid");
    await waitFor(() => expect(grid.textContent).toContain("460"));
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
    expect((await screen.findAllByText("Lignes")).length).toBeGreaterThan(0);
  });

  it("exports the grid", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    setup();
    await screen.findByTestId("pivot-grid");
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
    await screen.findByTestId("pivot-grid");
    expect(screen.queryByText("Cost")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Export")).toBeDisabled();
    expect(screen.getByLabelText("Place Region")).toBeDisabled();
  });

  it("supports controlled configuration", async () => {
    const onConfigChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PivotStudio data={data} fields={fields} config={baseConfig} onConfigChange={onConfigChange} />,
    );
    await user.click(screen.getByRole("button", { name: /chart/i }));
    expect(onConfigChange).toHaveBeenCalled();
  });

  it("uses a custom engine adapter when one is supplied", async () => {
    const query = vi.fn(async () => ({
      rowFields: ["region"],
      colFields: [],
      measure: { field: "revenue", caption: "Revenue", aggregator: "sum" as const },
      rowHeaders: [
        { key: ["Remote"], label: "Remote", depth: 0, kind: "member" as const, expandable: false, expanded: true, span: 1 },
      ],
      colHeaderRows: [],
      colLeaves: [
        { key: [], label: "Revenue", depth: 0, kind: "member" as const, expandable: false, expanded: true, span: 1 },
      ],
      cells: [[42]],
      rowTotals: [42],
      colTotals: [42],
      grandTotal: 42,
      sourceCount: 1,
      meta: { source: "backend" as const },
    }));
    setup({ engine: { id: "test", query, drillThrough: async () => [] } });
    const grid = await screen.findByTestId("pivot-grid");
    await waitFor(() => expect(grid.textContent).toContain("Remote"));
    expect(query).toHaveBeenCalled();
    expect(screen.getByText(/analytics service/)).toBeInTheDocument();
  });
});

describe("Flexmonster-style field list", () => {
  it("opens the field list dialog from the toolbar and shows the four areas", async () => {
    const user = userEvent.setup();
    setup({ fieldsUi: "dialog" });
    await user.click(screen.getAllByRole("button", { name: /^fields$/i })[0]!);
    const dialog = await screen.findByTestId("field-list-dialog");
    for (const area of ["filters", "cols", "rows", "values"]) {
      expect(within(dialog).getByTestId(`drop-area-${area}`)).toBeInTheDocument();
    }
    expect(within(dialog).getByTestId("field-chip-chip:rows:region")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /close/i }));
    expect(screen.queryByTestId("field-list-dialog")).not.toBeInTheDocument();
  });

  it("turns drag and drop off from the toolbar", async () => {
    const user = userEvent.setup();
    setup({ fieldsUi: "dialog" });
    await user.click(screen.getAllByRole("button", { name: /^fields$/i })[0]!);
    const dialog = await screen.findByTestId("field-list-dialog");
    expect(within(dialog).getAllByRole("button", { name: /^Drag / }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("checkbox", { name: /drag & drop/i }));
    await waitFor(() =>
      expect(within(dialog).queryAllByRole("button", { name: /^Drag / })).toHaveLength(0),
    );
    expect(within(dialog).getByTestId("field-chip-chip:rows:region")).toBeInTheDocument();
  });


  it("shows the in-grid field bar and removes a field from it", async () => {
    const user = userEvent.setup();
    setup({ fieldsUi: "dialog" });
    const bar = await screen.findByTestId("grid-field-bar");
    expect(within(bar).getByText("region")).toBeInTheDocument();
    await user.click(within(bar).getByRole("button", { name: "Remove category" }));
    await waitFor(() => expect(within(bar).queryByText("category")).not.toBeInTheDocument());
  });

  it("filters members from a report filter chip", async () => {
    const user = userEvent.setup();
    setup({
      fieldsUi: "dialog",
      initialConfig: {
        ...baseConfig,
        filters: [{ kind: "values", field: "region", mode: "include", members: [] }],
      },
    });
    const bar = await screen.findByTestId("grid-field-bar");
    await user.click(within(bar).getByRole("button", { name: "Filter region" }));
    const popover = await screen.findByTestId("member-filter-region");
    await user.click(within(popover).getByLabelText("South"));
    await user.click(within(popover).getByRole("button", { name: "OK" }));
    await waitFor(() => expect(screen.getByText(/2 records/)).toBeInTheDocument());
  });
});

describe("File upload", () => {
  it("loads a CSV file and pivots it", async () => {
    const user = userEvent.setup();
    setup({ allowFileUpload: true, fieldsUi: "dialog" });
    const file = new File(["city,product,units\nOslo,Pens,5\nOslo,Pads,7\n"], "sales.csv", {
      type: "text/csv",
    });
    await user.upload(screen.getByLabelText(/upload a csv or json file/i), file);
    await waitFor(() => expect(screen.getByText("sales.csv")).toBeInTheDocument());
    const grid = await screen.findByTestId("pivot-grid");
    await waitFor(() => expect(grid.textContent).toContain("Oslo"));
  });

  it("explains when the file has no rows", async () => {
    const user = userEvent.setup();
    setup({ allowFileUpload: true });
    const file = new File(["city,units\n"], "empty.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText(/upload a csv or json file/i), file);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no rows/i);
  });
});

describe("PivotStudio filter surfaces", () => {
  it("hides the report filter area from the toolbar", async () => {
    const user = userEvent.setup();
    setup({
      fieldsUi: "dialog",
      initialConfig: {
        ...baseConfig,
        filters: [{ kind: "values", field: "region", mode: "include", members: ["North"] }],
      },
    });
    expect(await screen.findByTestId("report-filter-area")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Filter area"));
    expect(screen.queryByTestId("report-filter-area")).not.toBeInTheDocument();
  });

  it("shows chart filter controls and filters the chart from them", async () => {
    const user = userEvent.setup();
    setup({ initialConfig: { ...baseConfig, chart: { visible: true, type: "bar" } } });
    const bar = screen.getByTestId("chart-filter-bar");
    await user.click(within(bar).getByLabelText("Filter chart by region"));
    const popover = await screen.findByTestId("member-filter-region");
    await user.click(within(popover).getByLabelText("South"));
    await user.click(within(popover).getByRole("button", { name: "OK" }));
    await waitFor(() =>
      expect(screen.getByTestId("chart-filter-summary")).toHaveTextContent("region"),
    );
    const grid = screen.getByRole("table");
    expect(within(grid).queryByText("South")).not.toBeInTheDocument();
    expect(within(grid).getByText("North")).toBeInTheDocument();
  });

  it("hides chart filter controls from the toolbar", async () => {
    const user = userEvent.setup();
    setup({ initialConfig: { ...baseConfig, chart: { visible: true, type: "bar" } } });
    await user.click(screen.getByLabelText("Chart filters"));
    expect(screen.queryByTestId("chart-filter-bar")).not.toBeInTheDocument();
  });

  it("offers a time picker and clock wording for time fields", async () => {
    const user = userEvent.setup();
    const timedRows: PivotRow[] = [
      { region: "North", orderTime: "08:15", revenue: 100 },
      { region: "South", orderTime: "12:30", revenue: 200 },
    ];
    setup({
      data: timedRows,
      fields: [
        { name: "region", caption: "Region", type: "string" },
        { name: "orderTime", caption: "Order time", type: "time" },
        { name: "revenue", caption: "Revenue", type: "number" },
      ],
      initialConfig: createDefaultConfig({
        rows: ["region"],
        values: [{ field: "revenue", aggregator: "sum" }],
      }),
    });
    await user.selectOptions(screen.getByLabelText("Filter type"), "condition");
    await user.selectOptions(screen.getByLabelText("Filter field"), "orderTime");
    expect(screen.getByLabelText("Filter value")).toHaveAttribute("type", "time");
    await user.selectOptions(screen.getByLabelText("Operator"), "gte");
    expect(screen.getByRole("option", { name: "is at or after" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Filter value"), "09:00");
    await user.click(screen.getByRole("button", { name: /add filter/i }));
    await waitFor(() => expect(screen.queryByText("North")).not.toBeInTheDocument());
  });

  it("adds a group condition (subquery) filter", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Filter type"), "subquery");
    await user.selectOptions(screen.getByLabelText("Filter field"), "region");
    await user.selectOptions(screen.getByLabelText("Group operator"), "gt");
    await user.clear(screen.getByLabelText("Group value"));
    await user.type(screen.getByLabelText("Group value"), "500");
    await user.click(screen.getByRole("button", { name: /add filter/i }));
    await waitFor(() => expect(screen.queryByText("North")).not.toBeInTheDocument());
    expect(screen.getByText(/region where sum of revenue/i)).toBeInTheDocument();
  });
});
