import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildChartData } from "./analysis";
import { createDefaultConfig } from "./types";
import type { PivotConfig, PivotRow } from "./types";
import { PivotChart } from "./ui/PivotChart";
import { ChartDrillBar } from "./ui/ChartDrillBar";
import { PivotStudio } from "./PivotStudio";

const rows: PivotRow[] = [
  { region: "West", country: "USA", year: "2024", quarter: "Q1", revenue: 100 },
  { region: "West", country: "USA", year: "2024", quarter: "Q2", revenue: 50 },
  { region: "West", country: "Canada", year: "2025", quarter: "Q1", revenue: 25 },
  { region: "East", country: "France", year: "2024", quarter: "Q1", revenue: 40 },
  { region: "East", country: "Spain", year: "2025", quarter: "Q2", revenue: 60 },
];

const fields = [
  { name: "region", type: "string" as const },
  { name: "country", type: "string" as const },
  { name: "year", type: "string" as const },
  { name: "quarter", type: "string" as const },
  { name: "revenue", type: "number" as const },
];

function cfg(patch: Partial<PivotConfig> = {}): PivotConfig {
  return createDefaultConfig({
    rows: ["region", "country"],
    cols: ["year", "quarter"],
    values: [{ field: "revenue", aggregator: "sum" }],
    chart: { visible: true, type: "stackedBar", position: "bottom" },
    ...patch,
  });
}

describe("chart data (drillable axis & legend)", () => {
  it("starts at the top level of both hierarchies", () => {
    const chart = buildChartData(rows, cfg());
    expect(chart.categoryField).toBe("region");
    expect(chart.seriesField).toBe("year");
    expect(chart.data.map((d) => d.name)).toEqual(["East", "West"]);
    expect(chart.series).toEqual(["2024", "2025"]);
    expect(chart.canDrillCategory).toBe(true);
    expect(chart.canDrillSeries).toBe(true);
  });

  it("drills the axis into the next row field", () => {
    const chart = buildChartData(
      rows,
      cfg({ chart: { visible: true, type: "bar", drillRows: ["West"] } }),
    );
    expect(chart.categoryField).toBe("country");
    expect(chart.data.map((d) => d.name)).toEqual(["Canada", "USA"]);
    expect(chart.canDrillCategory).toBe(false);
  });

  it("drills the legend into the next column field", () => {
    const chart = buildChartData(
      rows,
      cfg({ chart: { visible: true, type: "bar", drillCols: ["2024"] } }),
    );
    expect(chart.seriesField).toBe("quarter");
    expect(chart.series).toEqual(["Q1", "Q2"]);
    expect(chart.canDrillSeries).toBe(false);
  });

  it("hides series listed in hiddenSeries but keeps them in allSeries", () => {
    const chart = buildChartData(
      rows,
      cfg({ chart: { visible: true, type: "bar", hiddenSeries: ["2025"] } }),
    );
    expect(chart.series).toEqual(["2024"]);
    expect(chart.allSeries).toEqual(["2024", "2025"]);
    expect(chart.data[0]).not.toHaveProperty("2025");
  });

  it("aggregates the measure per category and series", () => {
    const chart = buildChartData(rows, cfg({ cols: ["year"] }));
    const west = chart.data.find((d) => d.name === "West");
    expect(west?.["2024"]).toBe(150);
    expect(west?.["2025"]).toBe(25);
  });
});

describe("PivotChart rendering", () => {
  const base = buildChartData(rows, cfg());

  it("renders stacked columns", () => {
    render(
      <PivotChart
        data={base.data}
        series={base.series}
        type="stackedBar"
        accent="#2f6feb"
        emptyLabel="No data"
      />,
    );
    expect(screen.getByTestId("pivot-chart")).toHaveAttribute("data-chart-type", "stackedBar");
  });

  it("renders the combined column + line chart", () => {
    render(
      <PivotChart
        data={base.data}
        series={base.series}
        lineSeries={["2025"]}
        type="columnLine"
        accent="#2f6feb"
        emptyLabel="No data"
      />,
    );
    expect(screen.getByTestId("pivot-chart")).toHaveAttribute("data-chart-type", "columnLine");
  });

  it("calls onSeriesClick from the legend", () => {
    const onSeriesClick = vi.fn();
    render(
      <PivotChart
        data={base.data}
        series={base.series}
        allSeries={base.allSeries}
        type="bar"
        accent="#2f6feb"
        emptyLabel="No data"
        onSeriesClick={onSeriesClick}
      />,
    );
    fireEvent.click(screen.getByTestId("chart-legend-2024"));
    expect(onSeriesClick).toHaveBeenCalledWith("2024");
  });

  it("marks hidden series in the legend", () => {
    render(
      <PivotChart
        data={base.data}
        series={["2024"]}
        allSeries={["2024", "2025"]}
        hiddenSeries={["2025"]}
        type="bar"
        accent="#2f6feb"
        emptyLabel="No data"
        onSeriesClick={() => {}}
      />,
    );
    expect(screen.getByTestId("chart-legend-2025")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("ChartDrillBar", () => {
  it("walks back up the drill path", () => {
    const onCategoryUp = vi.fn();
    render(
      <ChartDrillBar
        categoryPath={["West"]}
        seriesPath={[]}
        categoryField="country"
        onCategoryUp={onCategoryUp}
        onSeriesUp={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("Axis back to top level"));
    expect(onCategoryUp).toHaveBeenCalledWith(0);
  });
});

describe("PivotStudio chart integration", () => {
  const renderStudio = (patch: Partial<PivotConfig> = {}) =>
    render(<PivotStudio data={rows} fields={fields} initialConfig={cfg(patch)} />);

  it("shows the split view when the chart sits on the right", async () => {
    renderStudio({ chart: { visible: true, type: "bar", position: "right" } });
    expect(screen.getByTestId("pivot-panes")).toHaveAttribute("data-split", "true");
    expect(screen.getByTestId("pivot-chart-pane")).toBeInTheDocument();
    expect(await screen.findByTestId("pivot-grid")).toBeInTheDocument();
  });

  it("keeps the chart below the grid by default", () => {
    renderStudio();
    expect(screen.getByTestId("pivot-panes")).toHaveAttribute("data-split", "false");
  });

  it("switches to the split view from the toolbar", () => {
    renderStudio();
    fireEvent.change(screen.getByLabelText("Chart position"), { target: { value: "right" } });
    expect(screen.getByTestId("pivot-panes")).toHaveAttribute("data-split", "true");
  });

  it("offers stacked column and combined chart types", () => {
    renderStudio();
    const select = screen.getByLabelText("Chart type") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain("stackedBar");
    expect(values).toContain("columnLine");
    fireEvent.change(select, { target: { value: "columnLine" } });
    expect(screen.getByTestId("pivot-chart")).toHaveAttribute("data-chart-type", "columnLine");
  });

  it("drills the axis when an axis label is clicked", () => {
    renderStudio();
    fireEvent.click(screen.getByTestId("chart-axis-West"));
    expect(screen.getByTestId("chart-axis-crumbs")).toHaveTextContent("West");
    expect(screen.getByTestId("chart-axis-USA")).toBeInTheDocument();
  });

  it("drills the legend, then filters the series interactively", () => {
    renderStudio({ cols: ["year"] });
    fireEvent.click(screen.getByTestId("chart-legend-2024"));
    expect(screen.getByTestId("chart-legend-2024")).toHaveAttribute("aria-pressed", "false");
  });

  it("filters the report when the deepest axis level is clicked", () => {
    const onConfigChange = vi.fn();
    render(
      <PivotStudio
        data={rows}
        fields={fields}
        initialConfig={cfg({ rows: ["region"] })}
        onConfigChange={onConfigChange}
      />,
    );
    fireEvent.click(screen.getByTestId("chart-axis-West"));
    const last = onConfigChange.mock.calls.at(-1)?.[0] as PivotConfig;
    expect(last.filters).toContainEqual({
      kind: "values",
      field: "region",
      mode: "include",
      members: ["West"],
    });
  });
});
