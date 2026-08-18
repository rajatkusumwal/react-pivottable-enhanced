import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../analysis";
import type { ChartType } from "../types";

export interface PivotChartProps {
  data: ChartPoint[];
  /** Series to plot (already filtered by the legend). */
  series: string[];
  /** Every series at this level; hidden ones are still shown, dimmed, in the legend. */
  allSeries?: string[];
  hiddenSeries?: string[];
  /** Series drawn as lines when `type` is "columnLine". Defaults to the last series. */
  lineSeries?: string[];
  type: ChartType;
  accent: string;
  emptyLabel: string;
  /** Click on a bar / point — used for drill-through. */
  onPointClick?: ((point: ChartPoint, series: string) => void) | undefined;
  /** Click on an axis label — drills the category axis one level deeper. */
  onCategoryClick?: ((category: string) => void) | undefined;
  /** Click on a legend entry — drills the legend, or toggles the series when at the last level. */
  onSeriesClick?: ((series: string) => void) | undefined;
}

function palette(accent: string, index: number, total: number) {
  const hueShift = total > 1 ? (index / total) * 120 - 60 : 0;
  return `color-mix(in oklab, ${accent} ${Math.max(35, 100 - index * 12)}%, ${
    hueShift > 0 ? "#12b886" : "#f76707"
  })`;
}

export function PivotChart({
  data,
  series,
  allSeries,
  hiddenSeries = [],
  lineSeries,
  type,
  accent,
  emptyLabel,
  onPointClick,
  onCategoryClick,
  onSeriesClick,
}: PivotChartProps) {
  if (!data.length || !series.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const legendSeries = allSeries?.length ? allSeries : series;
  const asLine = lineSeries?.length ? lineSeries : series.slice(-1);

  const common = {
    data,
    onClick: (state: { activeLabel?: string | number }) => {
      const label = state?.activeLabel;
      const point = data.find((d) => d.name === String(label));
      if (point && onPointClick) onPointClick(point, series[0] as string);
    },
  };

  const axis = <XAxis dataKey="name" fontSize={12} interval={0} />;

  /**
   * HTML legend rendered outside the SVG: clicking an entry drills the legend
   * one level deeper, or hides/shows the series at the deepest level.
   */
  const legendBar = (
    <ul
      className="flex flex-wrap items-center justify-center gap-3 pb-1 text-xs"
      data-testid="chart-legend"
    >
      {legendSeries.map((s, i) => {
        const isHidden = hiddenSeries.includes(s);
        return (
          <li key={s}>
            <button
              type="button"
              data-testid={`chart-legend-${s}`}
              aria-pressed={!isHidden}
              className={`inline-flex items-center gap-1.5 ${
                onSeriesClick ? "cursor-pointer hover:underline" : "cursor-default"
              } ${isHidden ? "opacity-40 line-through" : ""}`}
              onClick={() => onSeriesClick?.(s)}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: palette(accent, i, legendSeries.length) }}
              />
              {s}
            </button>
          </li>
        );
      })}
    </ul>
  );

  /** Clickable axis labels — the drillable category axis. */
  const axisBar = (
    <ul
      className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs"
      data-testid="chart-axis-labels"
    >
      {data.map((point) => (
        <li key={point.name}>
          <button
            type="button"
            data-testid={`chart-axis-${point.name}`}
            className={onCategoryClick ? "rounded px-1 hover:bg-accent hover:underline" : "px-1"}
            onClick={() => onCategoryClick?.(String(point.name))}
          >
            {point.name}
          </button>
        </li>
      ))}
    </ul>
  );

  /**
   * Keyboard- and screen-reader-accessible drill-through for the chart: one
   * control per plotted point, mirroring a click on the bar / slice itself.
   */
  const drillBar = onPointClick ? (
    <ul className="sr-only" data-testid="chart-drill-points">
      {data.map((point) =>
        series.map((s) => (
          <li key={`${point.name}-${s}`}>
            <button
              type="button"
              data-testid={`chart-drill-${point.name}-${s}`}
              onClick={() => onPointClick(point, s)}
            >
              {`Records behind ${point.name} · ${s}`}
            </button>
          </li>
        )),
      )}
    </ul>
  ) : null;

  return (
    <div className="w-full" data-testid="pivot-chart" data-chart-type={type}>
      {legendBar}
      {drillBar}
      <ResponsiveContainer width="100%" height={300}>
        {type === "line" ? (
          <LineChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            {axis}
            <YAxis fontSize={12} />
            <Tooltip />
            {series.map((s, i) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={palette(accent, i, series.length)}
              />
            ))}
          </LineChart>
        ) : type === "area" ? (
          <AreaChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            {axis}
            <YAxis fontSize={12} />
            <Tooltip />
            {series.map((s, i) => (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                stackId="1"
                stroke={palette(accent, i, series.length)}
                fill={palette(accent, i, series.length)}
                fillOpacity={0.35}
              />
            ))}
          </AreaChart>
        ) : type === "pie" ? (
          <PieChart>
            <Tooltip />
            <Pie
              data={data}
              dataKey={series[0] as string}
              nameKey="name"
              outerRadius={110}
              onClick={(entry: unknown) => onPointClick?.(entry as ChartPoint, series[0] as string)}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={palette(accent, i, data.length)} />
              ))}
            </Pie>
          </PieChart>
        ) : type === "columnLine" ? (
          <ComposedChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            {axis}
            <YAxis fontSize={12} />
            <Tooltip />
            {series
              .filter((s) => !asLine.includes(s))
              .map((s, i) => (
                <Bar key={s} dataKey={s} fill={palette(accent, i, series.length)} />
              ))}
            {series
              .filter((s) => asLine.includes(s))
              .map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  strokeWidth={2}
                  stroke={palette(accent, series.length - 1 - i, series.length)}
                />
              ))}
          </ComposedChart>
        ) : (
          <BarChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            {axis}
            <YAxis fontSize={12} />
            <Tooltip />
            {series.map((s, i) => (
              <Bar
                key={s}
                dataKey={s}
                {...(type === "stackedBar" ? { stackId: "a" } : {})}
                fill={palette(accent, i, series.length)}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
      {axisBar}
    </div>
  );
}
