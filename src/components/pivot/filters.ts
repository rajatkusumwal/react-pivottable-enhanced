import { aggregate } from "./aggregators";
import type { ConditionOperator, FilterDef, PivotRow, PivotValue } from "./types";

export function matchesCondition(
  raw: PivotValue,
  operator: ConditionOperator,
  value: string | number,
  value2?: string | number,
): boolean {
  const text = String(raw ?? "").toLowerCase();
  const needle = String(value ?? "").toLowerCase();
  const num = Number(raw);
  const target = Number(value);
  switch (operator) {
    case "gt":
      return num > target;
    case "gte":
      return num >= target;
    case "lt":
      return num < target;
    case "lte":
      return num <= target;
    case "eq":
      return text === needle;
    case "neq":
      return text !== needle;
    case "between":
      return num >= target && num <= Number(value2);
    case "contains":
      return text.includes(needle);
    case "notContains":
      return !text.includes(needle);
    case "beginsWith":
      return text.startsWith(needle);
    case "endsWith":
      return text.endsWith(needle);
    default:
      return true;
  }
}

/** Applies value, conditional and top/bottom-N filters in order. */
export function applyFilters(rows: PivotRow[], filters: FilterDef[]): PivotRow[] {
  let out = rows;
  for (const filter of filters) {
    if (filter.kind === "values") {
      const set = new Set(filter.members.map(String));
      out = out.filter((r) => {
        const hit = set.has(String(r[filter.field]));
        return filter.mode === "include" ? hit : !hit;
      });
    } else if (filter.kind === "condition") {
      out = out.filter((r) =>
        matchesCondition(r[filter.field], filter.operator, filter.value, filter.value2),
      );
    } else {
      const groups = new Map<string, PivotRow[]>();
      for (const r of out) {
        const key = String(r[filter.field]);
        const bucket = groups.get(key);
        if (bucket) bucket.push(r);
        else groups.set(key, [r]);
      }
      const scored = [...groups.entries()].map(([key, group]) => ({
        key,
        score: aggregate(filter.aggregator, group, filter.measure) ?? 0,
      }));
      scored.sort((a, b) => (filter.direction === "top" ? b.score - a.score : a.score - b.score));
      const keep = new Set(scored.slice(0, Math.max(0, filter.count)).map((s) => s.key));
      out = out.filter((r) => keep.has(String(r[filter.field])));
    }
  }
  return out;
}

export function uniqueMembers(rows: PivotRow[], field: string): string[] {
  return [...new Set(rows.map((r) => String(r[field] ?? "")))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function describeFilter(filter: FilterDef): string {
  if (filter.kind === "values") {
    return `${filter.field}: ${filter.mode === "include" ? "only" : "not"} ${filter.members.length} value(s)`;
  }
  if (filter.kind === "condition") {
    return `${filter.field} ${filter.operator} ${filter.value}${
      filter.value2 !== undefined ? ` – ${filter.value2}` : ""
    }`;
  }
  return `${filter.direction === "top" ? "Top" : "Bottom"} ${filter.count} ${filter.field} by ${filter.measure}`;
}
