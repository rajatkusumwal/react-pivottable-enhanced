import { aggregate } from "./aggregators";
import type {
  ConditionOperator,
  ConditionValueType,
  FilterDef,
  PivotRow,
  PivotValue,
} from "./types";

const DAY = 86_400_000;
const isoLike = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;

/**
 * Parses ISO strings ("2024-03-01", full ISO timestamps), epoch numbers and Date
 * instances into a UTC-midnight timestamp so comparisons happen at day granularity.
 * Returns NaN when the value is not a date.
 */
export function parseDate(value: unknown): number {
  if (value instanceof Date) return Math.floor(value.getTime() / DAY) * DAY;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value / DAY) * DAY;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!isoLike.test(text)) return Number.NaN;
    const ms = Date.parse(text.length === 10 ? `${text}T00:00:00Z` : text);
    return Number.isNaN(ms) ? Number.NaN : Math.floor(ms / DAY) * DAY;
  }
  return Number.NaN;
}

const dateOperators: ConditionOperator[] = ["gt", "gte", "lt", "lte", "eq", "neq", "between"];

/** True when the condition should be evaluated on the date timeline. */
function useDates(
  valueType: ConditionValueType | undefined,
  operator: ConditionOperator,
  raw: PivotValue,
  value: string | number,
): boolean {
  if (!dateOperators.includes(operator)) return false;
  if (valueType === "date") return true;
  if (valueType && valueType !== "auto") return false;
  return !Number.isNaN(parseDate(raw)) && !Number.isNaN(parseDate(value));
}

export function matchesCondition(
  raw: PivotValue,
  operator: ConditionOperator,
  value: string | number,
  value2?: string | number,
  valueType?: ConditionValueType,
): boolean {
  const text = String(raw ?? "").toLowerCase();
  const needle = String(value ?? "").toLowerCase();
  const asDates = useDates(valueType, operator, raw, value);
  const num = asDates ? parseDate(raw) : Number(raw);
  const target = asDates ? parseDate(value) : Number(value);
  if (asDates && (Number.isNaN(num) || Number.isNaN(target))) return false;
  if (asDates && (operator === "eq" || operator === "neq")) {
    return operator === "eq" ? num === target : num !== target;
  }
  if (asDates && operator === "between") {
    const upper = parseDate(value2 as string | number);
    return !Number.isNaN(upper) && num >= target && num <= upper;
  }
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
      // An empty include list means "all members" (Flexmonster behaviour).
      if (filter.mode === "include" && filter.members.length === 0) continue;
      const set = new Set(filter.members.map(String));
      out = out.filter((r) => {
        const hit = set.has(String(r[filter.field]));
        return filter.mode === "include" ? hit : !hit;
      });
    } else if (filter.kind === "condition") {
      out = out.filter((r) =>
        matchesCondition(
          r[filter.field],
          filter.operator,
          filter.value,
          filter.value2,
          filter.valueType,
        ),
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
    const words =
      filter.valueType === "date"
        ? dateOperatorLabels[filter.operator]
        : undefined;
    return `${filter.field} ${words ?? filter.operator} ${filter.value}${
      filter.value2 !== undefined ? ` – ${filter.value2}` : ""
    }`;
  }
  return `${filter.direction === "top" ? "Top" : "Bottom"} ${filter.count} ${filter.field} by ${filter.measure}`;
}
