/**
 * Local pivot engine — aggregates in the browser.
 *
 * Member ordering comes from react-pivottable's `naturalSort`, the aggregation
 * itself from the shared aggregator registry, so subtotals and grand totals are
 * consistent with what the backend engine returns.
 */
import { naturalSort } from "react-pivottable/Utilities";
import { aggregate } from "../aggregators";
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
} from "../result";

interface TreeNode {
  path: string[];
  label: string;
  children: TreeNode[];
  rowIndexes: number[];
}

const sortMembers = (a: string, b: string) => naturalSort(a, b);

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

function levelNodes(node: TreeNode, depth: number, out: TreeNode[][] = []): TreeNode[][] {
  if (!node.children.length) return out;
  out[depth] ??= [];
  for (const child of node.children) {
    out[depth]!.push(child);
    levelNodes(child, depth + 1, out);
  }
  return out;
}

const leafCount = (node: TreeNode): number =>
  node.children.length ? node.children.reduce((n, c) => n + leafCount(c), 0) : 1;

export function measureOf(values: ValueDef[]): PivotMeasure {
  const value = values[0];
  return {
    field: value?.field ?? "",
    caption: value?.caption ?? value?.field ?? "Count",
    aggregator: value?.aggregator ?? "count",
    format: value?.format,
  };
}

/** Aggregates the intersection of a row node and a column node. */
function cellValue(
  rows: PivotRow[],
  rowIdx: number[] | null,
  colIdx: Set<number> | null,
  measure: PivotMeasure,
): number | null {
  let subset: PivotRow[];
  if (!rowIdx && !colIdx) subset = rows;
  else if (!rowIdx) subset = rows.filter((_, i) => colIdx!.has(i));
  else if (!colIdx) subset = rowIdx.map((i) => rows[i]!) as PivotRow[];
  else subset = rowIdx.filter((i) => colIdx.has(i)).map((i) => rows[i]!) as PivotRow[];
  if (!subset.length) return null;
  return aggregate(measure.aggregator, subset, measure.field);
}

export function buildLocalResult(rows: PivotRow[], query: PivotQuery): PivotResult {
  const measure = measureOf(query.values);
  const flat = query.layout === "flat";
  const rowTree = buildTree(rows, query.rows);
  const colTree = buildTree(rows, query.cols);

  // ---- columns -------------------------------------------------------------
  const colLeafNodes = query.cols.length ? flattenLeaves(colTree) : [];
  const colLevels = levelNodes(colTree, 0);
  const colHeaderRows: HeaderNode[][] = colLevels.map((level, depth) =>
    level.map((node) => ({
      key: node.path,
      label: node.label,
      depth,
      kind: "member" as const,
      expandable: false,
      expanded: true,
      span: leafCount(node),
    })),
  );
  const colLeaves: HeaderNode[] = colLeafNodes.map((node) => ({
    key: node.path,
    label: node.label,
    depth: node.path.length - 1,
    kind: "member" as const,
    expandable: false,
    expanded: true,
    span: 1,
  }));
  const colIndexSets = colLeafNodes.map((n) => new Set(n.rowIndexes));

  // ---- rows ----------------------------------------------------------------
  const collapsed = new Set(query.collapsed);
  const rowNodes: { header: HeaderNode; indexes: number[] | null }[] = [];

  const columnValue = (indexes: number[] | null, colIndex: number | "total") =>
    colIndex === "total"
      ? cellValue(rows, indexes, null, measure)
      : cellValue(rows, indexes, colIndexSets[colIndex] ?? null, measure);

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
    for (const leaf of query.rows.length ? flattenLeaves(rowTree) : []) {
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
  const grandTotal = cellValue(rows, null, null, measure);
  const colTotals = colIndexSets.map((set) => cellValue(rows, null, set, measure));
  const rowTotals = rowNodes.map((r) => cellValue(rows, r.indexes, null, measure));
  const displayMode = query.values[0]?.displayMode ?? "raw";

  const cells = rowNodes.map((r, rowIndex) => {
    let running = 0;
    return colIndexSets.length
      ? colIndexSets.map((set, colIndex) => {
          const raw = cellValue(rows, r.indexes, set, measure);
          running += raw ?? 0;
          return applyDisplayMode(
            raw,
            {
              grand: grandTotal,
              rowTotal: rowTotals[rowIndex] ?? null,
              colTotal: colTotals[colIndex] ?? null,
              running,
            },
            displayMode,
          );
        })
      : [];
  });

  return {
    rowFields: query.rows,
    colFields: query.cols,
    measure,
    rowHeaders: rowNodes.map((r) => r.header),
    colHeaderRows,
    colLeaves,
    cells,
    rowTotals,
    colTotals,
    grandTotal,
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
