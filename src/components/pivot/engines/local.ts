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
import type { PivotRow, ValueDef } from "../types";
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
  const measures = measuresOf(query.values);
  const measureCount = measures.length;
  const measure = measures[0] as PivotMeasure;
  const flat = query.layout === "flat";
  const rowTree = buildTree(rows, query.rows);
  const colTree = buildTree(rows, query.cols);

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
  const grandTotals = measures.map((m) => cellValue(rows, null, null, m));
  const colTotals = colLeaves.map((_, i) => {
    const base = baseColumns[Math.floor(i / measureCount)];
    const m = measures[measureIndexByLeaf[i] ?? 0] as PivotMeasure;
    return cellValue(rows, null, base?.indexes ?? null, m);
  });
  const rowTotalsByMeasure = rowNodes.map((r) =>
    measures.map((m) => cellValue(rows, r.indexes, null, m)),
  );
  const rowTotals = rowTotalsByMeasure.map((t) => num(t[0] ?? null));

  const cells: PivotCellValue[][] = rowNodes.map((r, rowIndex) => {
    const running = measures.map(() => 0);
    const out: PivotCellValue[] = [];
    baseColumns.forEach((base, baseIndex) => {
      measures.forEach((m, mi) => {
        const raw = cellValue(rows, r.indexes, base.indexes, m);
        const leafIndex = baseIndex * measureCount + mi;
        if (typeof raw !== "number") {
          out.push(raw);
          return;
        }
        running[mi] = (running[mi] ?? 0) + raw;
        out.push(
          applyDisplayMode(
            raw,
            {
              grand: num(grandTotals[mi] ?? null),
              rowTotal: num(rowTotalsByMeasure[rowIndex]?.[mi] ?? null),
              colTotal: num(colTotals[leafIndex] ?? null),
              running: running[mi] as number,
            },
            query.values[mi]?.displayMode ?? "raw",
          ),
        );
      });
    });
    return out;
  });

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
