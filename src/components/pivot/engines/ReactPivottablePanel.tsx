import { useMemo } from "react";
import PivotTable from "react-pivottable/PivotTable";
import TableRenderers from "react-pivottable/TableRenderers";
import "react-pivottable/pivottable.css";
import { aggregate } from "../aggregators";
import { formatNumber } from "../format";
import type { PivotConfig, PivotRow } from "../types";

export interface ReactPivottablePanelProps {
  rows: PivotRow[];
  config: PivotConfig;
  allowDrillThrough: boolean;
  onDrill: (title: string, records: PivotRow[]) => void;
}

interface AggInstance {
  records: PivotRow[];
  push: (record: PivotRow) => void;
  value: () => number | null;
  format: (value: number | null) => string;
  numInputs: number;
}

/**
 * Bridges the shared aggregator registry into react-pivottable's
 * `aggregator([field])(data, rowKey, colKey)` contract.
 */
export function createAggregatorBridge(
  aggregatorName: string,
  displayMode: string,
  grandTotal: number | null,
  locale: string,
  format: PivotConfig["values"][number]["format"],
) {
  return ([field]: string[]) =>
    (): AggInstance => ({
      records: [],
      numInputs: 1,
      push(record: PivotRow) {
        this.records.push(record);
      },
      value() {
        const raw = aggregate(aggregatorName, this.records, String(field));
        if (raw === null) return null;
        if (displayMode !== "raw" && displayMode !== "runningTotal" && grandTotal) {
          return (raw / grandTotal) * 100;
        }
        return raw;
      },
      format(value: number | null) {
        if (value === null) return "";
        return displayMode !== "raw" && displayMode !== "runningTotal"
          ? `${value.toFixed(1)}%`
          : formatNumber(value, format, locale);
      },
    });
}

export function ReactPivottablePanel({
  rows,
  config,
  allowDrillThrough,
  onDrill,
}: ReactPivottablePanelProps) {
  const value = config.values[0];
  const aggregatorName = value?.aggregator ?? "count";
  const field = value?.field ?? "";
  const displayMode = value?.displayMode ?? "raw";

  const grand = useMemo(
    () => (field ? aggregate(aggregatorName, rows, field) : null),
    [rows, aggregatorName, field],
  );

  const aggregators = useMemo(
    () => ({
      current: createAggregatorBridge(aggregatorName, displayMode, grand, config.locale, value?.format),
    }),
    [aggregatorName, displayMode, grand, config.locale, value?.format],
  );

  const density = config.theme.density === "compact" ? "0.15rem 0.35rem" : "0.35rem 0.6rem";

  return (
    <div
      className="pivot-engine-surface overflow-auto"
      data-testid="react-pivottable-panel"
      style={
        {
          "--pivot-accent": config.theme.accent,
          "--pivot-cell-padding": density,
          fontSize: config.theme.fontSize,
        } as React.CSSProperties
      }
    >
      <PivotTable
        data={rows as unknown as Record<string, unknown>[]}
        rows={config.rows}
        cols={config.cols}
        vals={[field]}
        aggregatorName="current"
        aggregators={aggregators}
        rendererName="Table"
        renderers={TableRenderers}
        tableOptions={{
          clickCallback: allowDrillThrough
            ? (_e: unknown, _value: unknown, filters: Record<string, string>) => {
                const records = rows.filter((r) =>
                  Object.entries(filters).every(([k, v]) => String(r[k] ?? "") === String(v)),
                );
                const label = Object.entries(filters)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ");
                onDrill(label || "All records", records);
              }
            : undefined,
        }}
      />
    </div>
  );
}
