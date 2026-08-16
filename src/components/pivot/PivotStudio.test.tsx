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

  it("adds a totals-aware calculated value from the field list", async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText("Formula scope"), "aggregate");
    expect(screen.getByText(/grandTotal\(\[revenue\]\)/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Calculated field name"));
    await user.type(screen.getByLabelText("Calculated field name"), "share");
    await user.clear(screen.getByLabelText("Formula"));
    // userEvent treats "[" as a key descriptor, so it is escaped as "[[".
    await user.type(
      screen.getByLabelText("Formula"),
      "[[revenue] / grandTotal([[revenue]) * 100",
    );
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await user.click(screen.getByRole("button", { name: "Remove Revenue" }));
    await user.selectOptions(await screen.findByLabelText("Place share"), "values");
    const grid = await screen.findByTestId("pivot-grid");
    // North / Bikes is 100 of the 1,000 grand total.
    await waitFor(() => expect(screen.getByTestId("cell-0-0").textContent).toContain("10"));
    expect(grid.textContent).toContain("100");
  });

  it("shows a KPI status against the goal declared by the data source", async () => {
    setup({
      fields: [
        ...fields,
        { name: "target", caption: "Target", type: "number" as const },
        {
          name: "revenueKpi",
          caption: "Revenue KPI",
          type: "number" as const,
          kpi: { goal: "target", direction: "higher" as const },
        },
      ],
      data: data.map((r) => ({ ...r, revenueKpi: r["revenue"], target: 150 })),
      initialConfig: createDefaultConfig({
        rows: ["region"],
        cols: ["category"],
        values: [{ field: "revenueKpi", aggregator: "sum" }],
      }),
    });
    const cell = await screen.findByTestId("cell-0-0");
    // North / Bikes is 100 against a goal of 150.
    await waitFor(() =>
      expect(within(cell).getByLabelText("Below target")).toBeInTheDocument(),
    );
    expect(screen.getAllByLabelText(/KPI: Revenue KPI/).length).toBeGreaterThan(0);
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
      measures: [{ field: "revenue", caption: "Revenue", aggregator: "sum" as const }],
      rowHeaders: [
        { key: ["Remote"], label: "Remote", depth: 0, kind: "member" as const, expandable: false, expanded: true, span: 1 },
      ],
      colHeaderRows: [],
      colLeaves: [
        { key: [], label: "Revenue", depth: 0, kind: "member" as const, expandable: false, expanded: true, span: 1 },
      ],
      measureIndexByLeaf: [0],
      cells: [[42]],
      rowTotals: [42],
      rowTotalsByMeasure: [[42]],
      colTotals: [42],
      grandTotal: 42,
      grandTotals: [42],
      kpiStatuses: [[null]],
      kpiRowTotals: [[null]],
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
    expect(within(bar).getByText("Region")).toBeInTheDocument();
    await user.click(within(bar).getByRole("button", { name: "Remove category" }));
    await waitFor(() => expect(within(bar).queryByText("Category")).not.toBeInTheDocument());
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

describe("PivotStudio field list and measures", () => {
  const hierFields = [
    { name: "region", caption: "Region", type: "string" as const, folder: "Geography", hierarchy: "Geography", level: 1 },
    { name: "city", caption: "City", type: "string" as const, folder: "Geography", hierarchy: "Geography", level: 2 },
    { name: "category", caption: "Category", type: "string" as const, folder: "Product" },
    { name: "revenue", caption: "Revenue", type: "number" as const, folder: "Measures" },
  ];
  const hierData: PivotRow[] = [
    { region: "North", city: "Oslo", category: "Bikes", revenue: 100 },
    { region: "South", city: "Rome", category: "Bikes", revenue: 300 },
  ];

  const renderHier = () =>
    render(
      <PivotStudio
        data={hierData}
        fields={hierFields}
        initialConfig={createDefaultConfig({
          rows: ["region"],
          cols: ["category"],
          values: [{ field: "revenue", aggregator: "sum", type: "number" }],
        })}
        title="Hierarchy pivot"
        fieldsUi="sidebar"
      />,
    );

  it("groups fields into folders and hierarchies", () => {
    renderHier();
    expect(screen.getByLabelText("Toggle folder Geography")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle folder Product")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle hierarchy Geography")).toBeInTheDocument();
  });

  it("adds every level of a hierarchy at once", async () => {
    const user = userEvent.setup();
    renderHier();
    await user.click(screen.getByLabelText("Add all levels of Geography to rows"));
    await waitFor(() =>
      expect(screen.getByTestId("field-chip-chip:rows:city")).toBeInTheDocument(),
    );
  });

  it("adds a single sublevel of a hierarchy", async () => {
    const user = userEvent.setup();
    renderHier();
    await user.selectOptions(screen.getByLabelText("Place City"), "rows");
    await waitFor(() =>
      expect(screen.getByTestId("field-chip-chip:rows:city")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("field-chip-chip:rows:region")).toBeInTheDocument();
  });

  it("searches the field list and collapses every group", async () => {
    const user = userEvent.setup();
    renderHier();
    const search = screen.getAllByPlaceholderText(/Search/i)[0] as HTMLElement;
    await user.type(search, "cit");
    expect(screen.queryByLabelText("Place Category")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Place City")).toBeInTheDocument();
    await user.clear(search);
    await user.click(screen.getByLabelText("Collapse all field groups"));
    expect(screen.queryByLabelText("Place Category")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Expand all field groups"));
    expect(screen.getByLabelText("Place Category")).toBeInTheDocument();
  });

  it("sorts field list items A → Z and Z → A", async () => {
    const user = userEvent.setup();
    renderHier();
    const sort = screen.getByLabelText("Sort fields");
    await user.selectOptions(sort, "asc");
    expect((sort as HTMLSelectElement).value).toBe("asc");
    await user.selectOptions(sort, "desc");
    expect((sort as HTMLSelectElement).value).toBe("desc");
  });

  it("shows several measures side by side, including a string measure", async () => {
    render(
      <PivotStudio
        data={hierData}
        fields={hierFields}
        initialConfig={createDefaultConfig({
          rows: ["region"],
          cols: [],
          values: [
            { field: "revenue", aggregator: "sum", type: "number" },
            { field: "revenue", aggregator: "average", type: "number" },
            { field: "city", aggregator: "distinctCount", type: "string" },
          ],
        })}
        title="Measures pivot"
        fieldsUi="sidebar"
      />,
    );
    expect(screen.getByTestId("field-chip-chip:values:revenue#0")).toBeInTheDocument();
    expect(screen.getByTestId("field-chip-chip:values:revenue#1")).toBeInTheDocument();
    expect(screen.getByTestId("field-chip-chip:values:city#2")).toBeInTheDocument();
    // The same field twice gets its own aggregation menu.
    expect(screen.getByLabelText("Aggregation for revenue")).toBeInTheDocument();
    expect(screen.getByLabelText("Aggregation for revenue (2)")).toBeInTheDocument();
  });

  it("only offers text aggregations for a string measure", () => {
    render(
      <PivotStudio
        data={hierData}
        fields={hierFields}
        initialConfig={createDefaultConfig({
          rows: ["region"],
          values: [{ field: "city", aggregator: "distinctCount", type: "string" }],
        })}
        title="String measure"
        fieldsUi="sidebar"
      />,
    );
    const select = screen.getByLabelText("Aggregation for city") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("distinctCount");
    expect(options).not.toContain("sum");
  });
});

describe("aggregation menu restrictions and the Σ icon", () => {
  const restrictedFields = [
    { name: "region", caption: "Region", type: "string" as const },
    {
      name: "revenue",
      caption: "Revenue",
      type: "number" as const,
      aggregators: ["average", "min", "max"],
    },
  ];

  it("only lists the aggregations a field allows", async () => {
    render(
      <PivotStudio
        data={data}
        fields={restrictedFields}
        initialConfig={createDefaultConfig({
          rows: ["region"],
          values: [{ field: "revenue", aggregator: "average" }],
        })}
        fieldsUi="sidebar"
      />,
    );
    const menu = await screen.findByLabelText("Aggregation for revenue");
    const options = within(menu).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Average", "Minimum", "Maximum"]);
  });

  it("offers the parent-total, difference and running-total display modes", async () => {
    setup();
    const menu = await screen.findByLabelText("Show revenue as");
    const options = within(menu).getAllByRole("option").map((o) => o.getAttribute("value"));
    expect(options).toEqual(
      expect.arrayContaining([
        "percentOfParentRowTotal",
        "percentOfParentColumnTotal",
        "differenceOfRow",
        "differenceOfColumn",
        "percentDifferenceOfRow",
        "percentDifferenceOfColumn",
        "runningTotalOfRow",
        "runningTotalOfColumn",
        "index",
      ]),
    );
  });

  it("shows the sigma icon on measures and hides it when switched off", async () => {
    const user = userEvent.setup();
    setup();
    expect((await screen.findAllByTestId("sigma-icon")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("checkbox", { name: /icon/i }));
    await waitFor(() => expect(screen.queryAllByTestId("sigma-icon")).toHaveLength(0));
  });
});

describe("Clear returns to the sample data", () => {
  const upload = async (user: ReturnType<typeof userEvent.setup>) => {
    const file = new File(["city,amount\nOslo,10\nRome,20\n"], "tiny.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("Upload a CSV or JSON file"), file);
    await waitFor(() => expect(screen.getByText("tiny.csv")).toBeInTheDocument());
  };

  it("drops the imported file when Clear is pressed", async () => {
    const user = userEvent.setup();
    setup({ allowFileUpload: true });
    await upload(user);

    await user.click(screen.getByRole("button", { name: /clear/i }));

    await waitFor(() => expect(screen.getByText("Sample data")).toBeInTheDocument());
    expect(screen.queryByText("tiny.csv")).not.toBeInTheDocument();
  });

  it("drops the imported file when 'Use sample data' is pressed", async () => {
    const user = userEvent.setup();
    setup({ allowFileUpload: true });
    await upload(user);

    await user.click(screen.getByRole("button", { name: /use sample data/i }));

    await waitFor(() => expect(screen.getByText("Sample data")).toBeInTheDocument());
    expect(window.sessionStorage.length).toBe(0);
  });
});
