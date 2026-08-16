import { useMemo } from "react";
import { pgrid } from "orb/src/js/orb.pgrid.js";
import type { OrbDimension } from "orb/src/js/orb.pgrid.js";
import { aggregate } from "../aggregators";
import { formatNumber } from "../format";
import { applyDisplayMode } from "../analysis";
import type { PivotStrings } from "../locales";
import type { PivotConfig, PivotRow } from "../types";

export interface OrbPanelProps {
  rows: PivotRow[];
  config: PivotConfig;
  strings: PivotStrings;
  allowDrillThrough: boolean;
  onDrill: (title: string, records: PivotRow[]) => void;
}

export interface OrbLeaf {
  key: string;
  labels: string[];
  records: PivotRow[];
}

/** Flattens one Orb axis into the leaf combinations we render as headers. */
export function collectLeaves(root: OrbDimension, rows: PivotRow[]): OrbLeaf[] {
  const out: OrbLeaf[] = [];
  const walk = (dim: OrbDimension, labels: string[]) => {
    const children = Object.values(dim.subdimvals ?? {});
    const nextLabels = dim.isRoot ? labels : [...labels, String(dim.value ?? "")];
    if (!children.length) {
      out.push({
        key: nextLabels.join(" / ") || "__all__",
        labels: nextLabels,
        records: dim.getRowIndexes().map((i) => rows[i] as PivotRow).filter(Boolean),
      });
      return;
    }
    for (const child of children) walk(child, nextLabels);
  };
  walk(root, []);
  return out;
}

/** Builds the pivot structure with the headless Orb engine (orb.pgrid). */
export function buildOrbGrid(rows: PivotRow[], config: PivotConfig) {
  const value = config.values[0];
  const grid = new pgrid({
    dataSource: rows as unknown as Record<string, unknown>[],
    canMoveFields: false,
    grandTotal: { rowsvisible: config.showGrandTotals, columnsvisible: config.showGrandTotals },
    subTotal: { visible: config.showSubTotals, collapsed: !config.expandAll },
    fields: [
      ...config.rows.map((name) => ({ name, caption: name })),
      ...config.cols.map((name) => ({ name, caption: name })),
      ...(value ? [{ name: value.field, caption: value.caption ?? value.field }] : []),
    ],
    rows: config.rows.map((name) => ({ name })),
    columns: config.cols.map((name) => ({ name })),
    data: value ? [{ name: value.field, aggregateFunc: "sum" }] : [],
  });

  const rowLeaves = collectLeaves(grid.rows.root, rows);
  const colLeaves = collectLeaves(grid.columns.root, rows);
  return { rowLeaves, colLeaves };
}

export function OrbPanel({ rows, config, strings, allowDrillThrough, onDrill }: OrbPanelProps) {
  const value = config.values[0];

  const { rowLeaves, colLeaves } = useMemo(() => {
    try {
      return buildOrbGrid(rows, config);
    } catch {
      return { rowLeaves: [], colLeaves: [] };
    }
  }, [rows, config]);

  if (!value || !rowLeaves.length) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{strings.noData}</p>;
  }

  const grand = aggregate(value.aggregator, rows, value.field);
  const pad = config.theme.density === "compact" ? "px-2 py-1" : "px-3 py-2";

  const cellRecords = (rowIdx: number, colIdx: number): PivotRow[] => {
    const rowSet = rowLeaves[rowIdx]?.records ?? [];
    const colLeaf = colLeaves[colIdx];
    if (!colLeaf || colLeaf.key === "__all__") return rowSet;
    const colSet = new Set(colLeaf.records);
    return rowSet.filter((r) => colSet.has(r));
  };

  const colTotals = colLeaves.map((_, c) =>
    aggregate(
      value.aggregator,
      rowLeaves.flatMap((_l, r) => cellRecords(r, c)),
      value.field,
    ),
  );

  return (
    <div className="overflow-auto" data-testid="orb-panel">
      <table
        className="min-w-full border-collapse text-left"
        style={{ fontSize: config.theme.fontSize }}
      >
        <thead>
          <tr>
            <th
              className={`sticky left-0 z-10 border border-border bg-secondary ${pad} font-semibold`}
              style={{ background: config.theme.headerBackground }}
            >
              {config.rows.join(" / ") || strings.rows}
            </th>
            {colLeaves.map((c) => (
              <th
                key={c.key}
                className={`border border-border ${pad} text-right font-semibold`}
                style={{ background: config.theme.headerBackground }}
              >
                {c.labels.join(" / ") || strings.total}
              </th>
            ))}
            {config.showGrandTotals && (
              <th
                className={`border border-border ${pad} text-right font-semibold`}
                style={{ background: config.theme.headerBackground }}
              >
                {strings.grandTotal}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rowLeaves.map((rowLeaf, r) => {
            const rowTotal = aggregate(value.aggregator, rowLeaf.records, value.field);
            let running = 0;
            return (
              <tr
                key={rowLeaf.key}
                className={config.theme.stripe && r % 2 ? "bg-secondary/40" : undefined}
              >
                <th
                  scope="row"
                  className={`sticky left-0 border border-border bg-card ${pad} font-medium`}
                >
                  {rowLeaf.labels.join(" / ") || strings.total}
                </th>
                {colLeaves.map((colLeaf, c) => {
                  const records = cellRecords(r, c);
                  const raw = aggregate(value.aggregator, records, value.field);
                  running += raw ?? 0;
                  const shown = applyDisplayMode(
                    raw,
                    { grand, rowTotal, colTotal: colTotals[c] ?? null, running },
                    value.displayMode ?? "raw",
                  );
                  const isPercent = (value.displayMode ?? "raw").startsWith("percent");
                  return (
                    <td
                      key={colLeaf.key}
                      className={`border border-border ${pad} text-right tabular-nums ${
                        allowDrillThrough ? "cursor-pointer hover:bg-secondary" : ""
                      }`}
                      title={allowDrillThrough ? strings.drillThrough : undefined}
                      onClick={
                        allowDrillThrough
                          ? () =>
                              onDrill(
                                [rowLeaf.labels.join(" / "), colLeaf.labels.join(" / ")]
                                  .filter(Boolean)
                                  .join(" · ") || strings.total,
                                records,
                              )
                          : undefined
                      }
                    >
                      {shown === null
                        ? ""
                        : isPercent
                          ? `${shown.toFixed(1)}%`
                          : formatNumber(shown, value.format, config.locale)}
                    </td>
                  );
                })}
                {config.showGrandTotals && (
                  <td className={`border border-border ${pad} text-right font-semibold tabular-nums`}>
                    {formatNumber(rowTotal, value.format, config.locale)}
                  </td>
                )}
              </tr>
            );
          })}
          {config.showGrandTotals && (
            <tr>
              <th scope="row" className={`sticky left-0 border border-border bg-secondary ${pad}`}>
                {strings.grandTotal}
              </th>
              {colTotals.map((t, i) => (
                <td
                  key={colLeaves[i]?.key ?? i}
                  className={`border border-border ${pad} text-right font-semibold tabular-nums`}
                >
                  {formatNumber(t, value.format, config.locale)}
                </td>
              ))}
              <td className={`border border-border ${pad} text-right font-bold tabular-nums`}>
                {formatNumber(grand, value.format, config.locale)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
