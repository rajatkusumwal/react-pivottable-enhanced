import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  series: string[];
  type: ChartType;
  accent: string;
  emptyLabel: string;
  onPointClick?: ((point: ChartPoint, series: string) => void) | undefined;
}

function palette(accent: string, index: number, total: number) {
  const hueShift = total > 1 ? (index / total) * 120 - 60 : 0;
  return `color-mix(in oklab, ${accent} ${Math.max(35, 100 - index * 12)}%, ${
    hueShift > 0 ? "#12b886" : "#f76707"
  })`;
}

export function PivotChart({ data, series, type, accent, emptyLabel, onPointClick }: PivotChartProps) {
  if (!data.length || !series.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">{emptyLabel}</div>
    );
  }

  const common = {
    data,
    onClick: (state: { activeLabel?: string | number }) => {
      const label = state?.activeLabel;
      const point = data.find((d) => d.name === String(label));
      if (point && onPointClick) onPointClick(point, series[0] as string);
    },
  };

  return (
    <div className="h-80 w-full" data-testid="pivot-chart">
      <ResponsiveContainer width="100%" height="100%">
        {type === "line" ? (
          <LineChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {series.map((s, i) => (
              <Line key={s} type="monotone" dataKey={s} stroke={palette(accent, i, series.length)} />
            ))}
          </LineChart>
        ) : type === "area" ? (
          <AreaChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
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
            <Legend />
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
        ) : (
          <BarChart {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
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
    </div>
  );
}
