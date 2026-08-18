/**
 * Inline cell editing.
 *
 * Commercial pivot tables let a user type a new number straight into a grid cell and
 * pushes that change back into the underlying records. We do the same locally:
 * the records behind the cell are updated so every total recomputes naturally.
 *
 * - `sum`  : the new value is spread across the contributing records in
 *            proportion to their current share (evenly when the current sum
 *            is zero, so the edit is never lost).
 * - `average` / `min` / `max` / `median` / `first` / `last` / `product`:
 *            every contributing record is set to the typed value.
 * - `count` / `distinctCount`: not editable (there is no number to write back).
 */
import type { AggregatorName, PivotRow } from "./types";

export interface CellEditRequest {
  rowFields: string[];
  colFields: string[];
  rowKey: string[];
  colKey: string[];
  field: string;
  aggregator: AggregatorName;
  value: number;
}

export interface CellEditResult {
  rows: PivotRow[];
  changed: boolean;
  reason?: string;
}

const NON_EDITABLE: AggregatorName[] = ["count", "distinctCount"];

export function isEditableAggregator(aggregator: AggregatorName): boolean {
  return !NON_EDITABLE.includes(aggregator);
}

/** Indexes of the records that make up one grid cell. */
export function matchingIndexes(rows: PivotRow[], request: CellEditRequest): number[] {
  const out: number[] = [];
  rows.forEach((row, index) => {
    for (let i = 0; i < request.rowKey.length; i++) {
      const field = request.rowFields[i];
      if (field && String(row[field] ?? "") !== request.rowKey[i]) return;
    }
    for (let i = 0; i < request.colKey.length; i++) {
      const field = request.colFields[i];
      if (field && String(row[field] ?? "") !== request.colKey[i]) return;
    }
    out.push(index);
  });
  return out;
}

export function applyCellEdit(rows: PivotRow[], request: CellEditRequest): CellEditResult {
  if (!request.field) return { rows, changed: false, reason: "No measure to edit" };
  if (!isEditableAggregator(request.aggregator)) {
    return { rows, changed: false, reason: `${request.aggregator} cells cannot be edited` };
  }
  if (!Number.isFinite(request.value)) return { rows, changed: false, reason: "Enter a number" };

  const indexes = matchingIndexes(rows, request);
  if (!indexes.length) return { rows, changed: false, reason: "No records behind this cell" };

  const next = rows.slice();
  if (request.aggregator === "sum") {
    const current = indexes.reduce((sum, i) => sum + (Number(rows[i]?.[request.field]) || 0), 0);
    indexes.forEach((i) => {
      const row = rows[i]!;
      const own = Number(row[request.field]) || 0;
      const share = current === 0 ? 1 / indexes.length : own / current;
      next[i] = { ...row, [request.field]: request.value * share };
    });
  } else {
    indexes.forEach((i) => {
      next[i] = { ...rows[i]!, [request.field]: request.value };
    });
  }
  return { rows: next, changed: true };
}
