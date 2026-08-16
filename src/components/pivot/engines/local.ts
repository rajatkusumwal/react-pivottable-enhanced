/**
 * Local pivot engine — aggregates in the browser.
 *
 * Member ordering comes from react-pivottable's `naturalSort`, the aggregation
 * itself from the shared aggregator registry, so subtotals and grand totals are
 * consistent with what the backend engine returns.
 */
import { naturalSort } from "react-pivottable/Utilities";
import { aggregate, type PivotCellValue } from "../aggregators";
import { applyDisplayMode } from "../analysis";
import { evaluateWithContext, isAggregateField, type TotalScope } from "../calculated";
import { computeKpiStatus } from "../kpi";
import type { AggregatorName, CalculatedField, KpiStatus, PivotRow, ValueDef } from "../types";
import {
  KEY_SEP,
  keyOf,
  type DrillThroughQuery,
  type HeaderNode,
  type PivotEngineAdapter,
  type PivotMeasure,
  type PivotQuery,
  type PivotResult,
  type PivotSort,
} from "../result";

interface TreeNode {
  path: string[];
  label: string;
  children: TreeNode[];
  rowIndexes: number[];
}

const sortMembers = (a: string, b: string) => naturalSort(a, b);

/** Numeric view of a cell — text measures never take part in maths. */
const num = (v: PivotCellValue): number | null => (typeof v === "number" ? v : null);

function buildTree(rows: PivotRow[], fields: string[]): TreeNode {
  const root: TreeNode = { path: [], label: "", children: [], rowIndexes: [] };
  rows.forEach((row, index) => {
    root.rowIndexes.push(index);
    let node = root;
    for (const field of fields) {
      const label = String(row[field] ?? "");
      let child = node.children.find((c) => c.label === label);
      if (!child) {
        child = { path: [...node.path, label], label, children: [], rowIndexes: [] };
        node.children.push(child);
      }
      child.rowIndexes.push(index);
      node = child;
    }
  });
  const sortTree = (node: TreeNode) => {
    node.children.sort((a, b) => sortMembers(a.label, b.label));
    node.children.forEach(sortTree);
  };
  sortTree(root);
  return root;
}

function flattenLeaves(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  if (!node.children.length) {
    if (node.path.length) out.push(node);
    return out;
  }
  node.children.forEach((c) => flattenLeaves(c, out));
  return out;
}

const measureFromValue = (value: ValueDef): PivotMeasure => ({
  field: value.field,
  caption: value.caption ?? value.field,
  aggregator: value.aggregator,
  format: value.format,
  type: value.type,
});

/** Every measure in report order; the same field may appear with several aggregations. */
export function measuresOf(values: ValueDef[]): PivotMeasure[] {
  if (!values.length) {
    return [{ field: "", caption: "Count", aggregator: "count", type: "number" }];
  }
  return values.map(measureFromValue);
}

export function measureOf(values: ValueDef[]): PivotMeasure {
  return measuresOf(values)[0] as PivotMeasure;
}

/** Aggregates the intersection of a row node and a column node. */
function cellValue(
  rows: PivotRow[],
  rowIdx: number[] | null,
  colIdx: Set<number> | null,
  measure: PivotMeasure,
): PivotCellValue {
  let subset: PivotRow[];
  if (!rowIdx && !colIdx) subset = rows;
  else if (!rowIdx) subset = rows.filter((_, i) => colIdx!.has(i));
  else if (!colIdx) subset = rowIdx.map((i) => rows[i]!) as PivotRow[];
  else subset = rowIdx.filter((i) => colIdx.has(i)).map((i) => rows[i]!) as PivotRow[];
  if (!subset.length) return null;
  return aggregate(measure.aggregator, subset, measure.field, measure.type);
}

export function buildLocalResult(rows: PivotRow[], query: PivotQuery): PivotResult {
  // Aggregate-scope calculated fields become measures evaluated per cell, and
  // KPI metadata from the data source rides along with the measure.
  const calcByName = new Map<string, CalculatedField>(
    (query.calculated ?? []).filter(isAggregateField).map((c) => [c.name, c]),
  );
  const kpis = query.kpis ?? {};
  const measures = measuresOf(query.values).map((m) => {
    const kpi = kpis[m.field];
    return {
      ...m,
      ...(calcByName.has(m.field) ? { calculated: true } : {}),
      ...(kpi ? { kpi } : {}),
    } satisfies PivotMeasure;
  });
  const measureCount = measures.length;
  const measure = measures[0] as PivotMeasure;
  const flat = query.layout === "flat";
  const rowTree = buildTree(rows, query.rows);
  const colTree = buildTree(rows, query.cols);

  const aggFor = (
    rowIdx: number[] | null,
    colIdx: Set<number> | null,
    field: string,
    aggregator: AggregatorName,
  ) => num(cellValue(rows, rowIdx, colIdx, { field, caption: field, aggregator }));

  /**
   * Value of one measure for a cell. Plain measures aggregate their field;
   * aggregate-scope calculated measures evaluate their formula, with
   * grandTotal() / rowTotal() / columnTotal() / parent totals resolved against
   * this very cell.
   */
  const measureValue = (
    rowIdx: number[] | null,
    colIdx: Set<number> | null,
    m: PivotMeasure,
    parentRowIdx: number[] | null = null,
    parentColIdx: Set<number> | null = null,
  ): PivotCellValue => {
    const calc = calcByName.get(m.field);
    if (!calc) return cellValue(rows, rowIdx, colIdx, m);
    const agg = calc.aggregator ?? "sum";
    const total = (scope: TotalScope, field: string) => {
      switch (scope) {
        case "grand":
          return aggFor(null, null, field, agg);
        case "row":
          return aggFor(rowIdx, null, field, agg);
        case "column":
          return aggFor(null, colIdx, field, agg);
        case "parentRow":
          return aggFor(parentRowIdx, colIdx, field, agg);
        default:
          return aggFor(rowIdx, parentColIdx, field, agg);
      }
    };
    try {
      return evaluateWithContext(calc.formula, {
        value: (field) => aggFor(rowIdx, colIdx, field, agg),
        total,
      });
    } catch {
      return null;
    }
  };

  // ---- columns -------------------------------------------------------------
  // Column members drill down the same way rows do: a collapsed member keeps a
  // single aggregated leaf column and hides its descendants. Every leaf is then
  // repeated once per measure, so several measures can be shown side by side.
  const collapsedCols = new Set(query.collapsedCols ?? []);
  const isColCollapsed = (node: TreeNode) =>
    node.children.length > 0 && collapsedCols.has(keyOf(node.path));
  const visibleLeafCount = (node: TreeNode): number =>
    !node.children.length || isColCollapsed(node)
      ? 1
      : node.children.reduce((n, c) => n + visibleLeafCount(c), 0);

  const colDepth = query.cols.length;
  const colHeaderRows: HeaderNode[][] = [];
  const colLeafNodes: TreeNode[] = [];
  const baseLeaves: HeaderNode[] = [];

  const walkCols = (node: TreeNode, depth: number) => {
    for (const child of node.children) {
      const collapsedHere = isColCollapsed(child);
      const stopsHere = !child.children.length || collapsedHere;
      const header: HeaderNode = {
        key: child.path,
        label: child.label,
        depth,
        kind: "member",
        expandable: child.children.length > 0,
        expanded: !collapsedHere,
        span: visibleLeafCount(child) * measureCount,
        rowSpan: stopsHere ? Math.max(colDepth - depth, 1) : 1,
      };
      (colHeaderRows[depth] ??= []).push(header);
      if (stopsHere) {
        colLeafNodes.push(child);
        baseLeaves.push({ ...header, span: measureCount });
      } else {
        walkCols(child, depth + 1);
      }
    }
  };
  if (query.cols.length) walkCols(colTree, 0);
  for (let d = 0; d < colHeaderRows.length; d++) colHeaderRows[d] ??= [];

  /** Base columns before the measures are multiplied in. */
  const baseColumns: { key: string[]; indexes: Set<number> | null }[] = query.cols.length
    ? colLeafNodes.map((n, i) => ({ key: baseLeaves[i]?.key ?? n.path, indexes: new Set(n.rowIndexes) }))
    : measureCount > 1
      ? [{ key: [], indexes: null }]
      : [];

  const colLeaves: HeaderNode[] = [];
  const measureIndexByLeaf: number[] = [];
  for (const base of baseColumns) {
    measures.forEach((m, mi) => {
      colLeaves.push({
        key: measureCount > 1 ? [...base.key, m.caption] : base.key,
        label: measureCount > 1 ? m.caption : (base.key.at(-1) ?? m.caption),
        depth: colDepth,
        kind: "member",
        expandable: false,
        expanded: true,
        span: 1,
      });
      measureIndexByLeaf.push(mi);
    });
  }
  // A dedicated header row naming the measure under every column member.
  if (measureCount > 1) colHeaderRows.push(colLeaves.map((leaf) => ({ ...leaf })));

  // ---- rows ----------------------------------------------------------------
  const collapsed = new Set(query.collapsed);
  const rowNodes: { header: HeaderNode; indexes: number[] | null }[] = [];

  const columnValue = (indexes: number[] | null, colIndex: number | "total"): number | null => {
    if (colIndex === "total") return num(cellValue(rows, indexes, null, measure));
    const base = baseColumns[Math.floor(colIndex / measureCount)];
    const m = measures[measureIndexByLeaf[colIndex] ?? 0] ?? measure;
    return num(cellValue(rows, indexes, base?.indexes ?? null, m));
  };

  /** Multi-column sort: `sorts` wins, otherwise the single `sort`. */
  const activeSorts = query.sorts?.length ? query.sorts : query.sort ? [query.sort] : [];

  const compareBy = (a: TreeNode, b: TreeNode, sort: PivotSort, label: (n: TreeNode) => string) => {
    const dir = sort.direction === "asc" ? 1 : -1;
    if (sort.by === "rows") return dir * sortMembers(label(a), label(b));
    return (
      dir *
      ((columnValue(a.rowIndexes, sort.by) ?? -Infinity) -
        (columnValue(b.rowIndexes, sort.by) ?? -Infinity))
    );
  };

  const sortNodes = (nodes: TreeNode[], sorts: PivotSort[], label: (n: TreeNode) => string) => {
    if (!sorts.length) return nodes;
    return [...nodes].sort((a, b) => {
      for (const sort of sorts) {
        const cmp = compareBy(a, b, sort, label);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  };

  // Nested layouts sort each level by the primary sort only.
  const sortChildren = (children: TreeNode[]) =>
    sortNodes(children, activeSorts.slice(0, 1), (n) => n.label);

  const walk = (node: TreeNode, depth: number) => {
    for (const child of sortChildren(node.children)) {
      const isLeaf = !child.children.length;
      const key = keyOf(child.path);
      const isCollapsed = collapsed.has(key);
      rowNodes.push({
        header: {
          key: child.path,
          label: child.label,
          depth,
          kind: "member",
          expandable: !isLeaf,
          expanded: !isCollapsed,
          span: 1,
        },
        indexes: child.rowIndexes,
      });
      if (!isLeaf && !isCollapsed) {
        walk(child, depth + 1);
        if (query.showSubTotals) {
          rowNodes.push({
            header: {
              key: child.path,
              label: `${child.label} total`,
              depth,
              kind: "subtotal",
              expandable: false,
              expanded: true,
              span: 1,
            },
            indexes: child.rowIndexes,
          });
        }
      }
    }
  };

  if (flat) {
    const leaves = query.rows.length ? flattenLeaves(rowTree) : [];
    for (const leaf of sortNodes(leaves, activeSorts, (n) => n.path.join(" / "))) {
      rowNodes.push({
        header: {
          key: leaf.path,
          label: leaf.path.join(" / "),
          depth: 0,
          kind: "member",
          expandable: false,
          expanded: true,
          span: 1,
        },
        indexes: leaf.rowIndexes,
      });
    }
  } else {
    walk(rowTree, 0);
  }

  if (query.showGrandTotals) {
    const grandNode = {
      header: {
        key: [] as string[],
        label: "Grand total",
        depth: 0,
        kind: "grand" as const,
        expandable: false,
        expanded: true,
        span: 1,
      },
      indexes: null,
    };
    if (query.grandTotalsPosition === "top") rowNodes.unshift(grandNode);
    else rowNodes.push(grandNode);
  }

  // ---- cells ---------------------------------------------------------------
  // Member paths -> the records underneath them, used by the "% of parent" modes.
  const rowIndexByPath = new Map<string, number[]>();
  const collectRows = (node: TreeNode) => {
    if (node.path.length) rowIndexByPath.set(keyOf(node.path), node.rowIndexes);
    node.children.forEach(collectRows);
  };
  collectRows(rowTree);
  const colIndexByPath = new Map<string, Set<number>>();
  const collectCols = (node: TreeNode) => {
    if (node.path.length) colIndexByPath.set(keyOf(node.path), new Set(node.rowIndexes));
    node.children.forEach(collectCols);
  };
  collectCols(colTree);

  /** Parent group of a member path; null means "the whole report". */
  const parentRowIndexes = rowNodes.map((r) =>
    r.header.key.length > 1 ? (rowIndexByPath.get(keyOf(r.header.key.slice(0, -1))) ?? null) : null,
  );
  const parentColIndexes = baseColumns.map((base) => {
    const path = query.cols.length ? base.key.slice(0, query.cols.length) : [];
    return path.length > 1 ? (colIndexByPath.get(keyOf(path.slice(0, -1))) ?? null) : null;
  });

  const grandTotals = measures.map((m) => measureValue(null, null, m));
  const colTotals = colLeaves.map((_, i) => {
    const base = baseColumns[Math.floor(i / measureCount)];
    const m = measures[measureIndexByLeaf[i] ?? 0] as PivotMeasure;
    return measureValue(null, base?.indexes ?? null, m);
  });
  const rowTotalsByMeasure = rowNodes.map((r, rowIndexOf) =>
    measures.map((m) => measureValue(r.indexes, null, m, parentRowIndexes[rowIndexOf] ?? null)),
  );
  const rowTotals = rowTotalsByMeasure.map((t) => num(t[0] ?? null));

  // Pass 1 — raw aggregates. Pass 2 applies "show values as", which may need
  // neighbouring cells (differences, running totals down a column).
  const rawCells: PivotCellValue[][] = rowNodes.map((r, rowIndex) => {
    const out: PivotCellValue[] = [];
    baseColumns.forEach((base, baseIndex) => {
      measures.forEach((m) =>
        out.push(
          measureValue(
            r.indexes,
            base.indexes,
            m,
            parentRowIndexes[rowIndex] ?? null,
            parentColIndexes[baseIndex] ?? null,
          ),
        ),
      );
    });
    return out;
  });

  const runningColumn = colLeaves.map(() => 0);
  const cells: PivotCellValue[][] = rowNodes.map((r, rowIndex) => {
    const running = measures.map(() => 0);
    const out: PivotCellValue[] = [];
    baseColumns.forEach((base, baseIndex) => {
      measures.forEach((m, mi) => {
        const leafIndex = baseIndex * measureCount + mi;
        const raw = rawCells[rowIndex]?.[leafIndex] ?? null;
        if (typeof raw !== "number") {
          out.push(raw);
          return;
        }
        running[mi] = (running[mi] ?? 0) + raw;
        runningColumn[leafIndex] = (runningColumn[leafIndex] ?? 0) + raw;
        const mode = query.values[mi]?.displayMode ?? "raw";
        const needsParent =
          mode === "percentOfParentRowTotal" || mode === "percentOfParentColumnTotal";
        out.push(
          applyDisplayMode(
            raw,
            {
              grand: num(grandTotals[mi] ?? null),
              rowTotal: num(rowTotalsByMeasure[rowIndex]?.[mi] ?? null),
              colTotal: num(colTotals[leafIndex] ?? null),
              // Omitted without a parent level so the transform falls back
              // to the plain row / column total.
              ...(needsParent && parentRowIndexes[rowIndex]
                ? {
                    parentRowTotal: num(
                      measureValue(parentRowIndexes[rowIndex] as number[], base.indexes, m),
                    ),
                  }
                : {}),
              ...(needsParent && parentColIndexes[baseIndex]
                ? {
                    parentColTotal: num(
                      measureValue(r.indexes, parentColIndexes[baseIndex] as Set<number>, m),
                    ),
                  }
                : {}),
              running: running[mi] as number,
              runningColumn: runningColumn[leafIndex] as number,
              prevInRow: baseIndex > 0 ? num(rawCells[rowIndex]?.[leafIndex - measureCount] ?? null) : null,
              prevInColumn: rowIndex > 0 ? num(rawCells[rowIndex - 1]?.[leafIndex] ?? null) : null,
            },
            mode,
          ),
        );
      });
    });
    return out;
  });


  // ---- KPI statuses --------------------------------------------------------
  const goalValue = (
    m: PivotMeasure,
    rowIdx: number[] | null,
    colIdx: Set<number> | null,
  ): number | null =>
    !m.kpi
      ? null
      : typeof m.kpi.goal === "number"
        ? m.kpi.goal
        : num(cellValue(rows, rowIdx, colIdx, { ...m, field: m.kpi.goal }));

  const kpiStatuses: (KpiStatus | null)[][] = rowNodes.map((r, rowIndex) =>
    colLeaves.map((_, leafIndex) => {
      const m = measures[measureIndexByLeaf[leafIndex] ?? 0];
      if (!m?.kpi) return null;
      const base = baseColumns[Math.floor(leafIndex / measureCount)];
      const value = num(rawCells[rowIndex]?.[leafIndex] ?? null);
      return computeKpiStatus(value, goalValue(m, r.indexes, base?.indexes ?? null), m.kpi);
    }),
  );

  const kpiRowTotals: (KpiStatus | null)[][] = rowNodes.map((r, rowIndex) =>
    measures.map((m, mi) =>
      m.kpi
        ? computeKpiStatus(
            num(rowTotalsByMeasure[rowIndex]?.[mi] ?? null),
            goalValue(m, r.indexes, null),
            m.kpi,
          )
        : null,
    ),
  );

  return {
    rowFields: query.rows,
    colFields: query.cols,
    measure,
    measures,
    rowHeaders: rowNodes.map((r) => r.header),
    colHeaderRows,
    colLeaves,
    measureIndexByLeaf,
    cells,
    rowTotals,
    rowTotalsByMeasure,
    colTotals,
    grandTotal: num(grandTotals[0] ?? null),
    grandTotals,
    kpiStatuses,
    kpiRowTotals,
    sourceCount: rows.length,
    meta: { source: "local" },
  };
}


export function localDrillThrough(rows: PivotRow[], request: DrillThroughQuery): PivotRow[] {
  const { rowKey, colKey, query } = request;
  return rows.filter((row) => {
    for (let i = 0; i < rowKey.length; i++) {
      const field = query.rows[i];
      if (field && String(row[field] ?? "") !== rowKey[i]) return false;
    }
    for (let i = 0; i < colKey.length; i++) {
      const field = query.cols[i];
      if (field && String(row[field] ?? "") !== colKey[i]) return false;
    }
    return true;
  });
}

export function createLocalEngine(): PivotEngineAdapter {
  return {
    id: "local",
    query: async (request, rows) => buildLocalResult(rows, request),
    drillThrough: async (request, rows) => localDrillThrough(rows, request),
  };
}

export { KEY_SEP };
