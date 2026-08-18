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
function parseDate(value: unknown): number {
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

const timeLike = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const isoTimePart = /[T ](\d{2}:\d{2}(?::\d{2})?)/;

/**
 * Parses clock times ("09:30", "09:30:15") and the time part of an ISO
 * timestamp into seconds since midnight. Returns NaN when there is no time.
 */
export function parseTime(value: unknown): number {
  const text =
    value instanceof Date
      ? value.toISOString().slice(11, 19)
      : typeof value === "string"
        ? (value.trim().match(isoTimePart)?.[1] ?? value.trim())
        : typeof value === "number" && Number.isFinite(value)
          ? null
          : null;
  if (text === null) {
    // Numbers are read as seconds since midnight already.
    return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
  }
  const m = timeLike.exec(text);
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3] ?? 0);
  if (h > 23 || min > 59 || sec > 59) return Number.NaN;
  return h * 3600 + min * 60 + sec;
}

const dateOperators: ConditionOperator[] = ["gt", "gte", "lt", "lte", "eq", "neq", "between"];

/** Plain-English wording used when a condition runs on the date timeline. */
export const dateOperatorLabels: Partial<Record<ConditionOperator, string>> = {
  gt: "is after",
  gte: "is on or after",
  lt: "is before",
  lte: "is on or before",
  eq: "is on",
  neq: "is not on",
  between: "is between",
};

/** Plain-English wording used when a condition runs on the clock. */
export const timeOperatorLabels: Partial<Record<ConditionOperator, string>> = {
  gt: "is after",
  gte: "is at or after",
  lt: "is before",
  lte: "is at or before",
  eq: "is at",
  neq: "is not at",
  between: "is between",
};

/** True when the condition should be evaluated on the clock (seconds of day). */
function comparesAsTime(
  valueType: ConditionValueType | undefined,
  operator: ConditionOperator,
): boolean {
  return valueType === "time" && dateOperators.includes(operator);
}

/** True when the condition should be evaluated on the date timeline. */
function comparesAsDate(
  valueType: ConditionValueType | undefined,
  operator: ConditionOperator,
  raw: PivotValue,
  value: string | number,
): boolean {
  if (!dateOperators.includes(operator)) return false;
  if (valueType === "date") return true;
  if (valueType && valueType !== "auto") return false;
  // In auto mode only ISO-like text counts, so plain numbers stay numeric.
  const isoText = (v: unknown) => typeof v === "string" && !Number.isNaN(parseDate(v));
  return isoText(raw) && isoText(value);
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
  const asTimes = comparesAsTime(valueType, operator);
  const asDates = !asTimes && comparesAsDate(valueType, operator, raw, value);
  const scale = asTimes ? parseTime : parseDate;
  const scaled = asTimes || asDates;
  const num = scaled ? scale(raw) : Number(raw);
  const target = scaled ? scale(value) : Number(value);
  if (scaled && (Number.isNaN(num) || Number.isNaN(target))) return false;
  if (scaled && (operator === "eq" || operator === "neq")) {
    return operator === "eq" ? num === target : num !== target;
  }
  if (scaled && operator === "between") {
    const upper = scale(value2 as string | number);
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

function groupBy(rows: PivotRow[], field: string): Map<string, PivotRow[]> {
  const groups = new Map<string, PivotRow[]>();
  for (const r of rows) {
    const key = String(r[field]);
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }
  return groups;
}

/** Applies value, conditional, subquery and top/bottom-N filters in order. */
export function applyFilters(rows: PivotRow[], filters: FilterDef[]): PivotRow[] {
  let out = rows;
  for (const filter of filters) {
    if (filter.kind === "values") {
      // An empty include list means "all members" (standard commercial behaviour).
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
    } else if (filter.kind === "subquery") {
      // Nested aggregation per member, then a HAVING-style comparison.
      const groups = groupBy(out, filter.field);
      const keep = new Set(
        [...groups.entries()]
          .filter(([, group]) =>
            matchesCondition(
              aggregate(filter.aggregator, group, filter.measure) ?? 0,
              filter.operator,
              filter.value,
              filter.value2,
              "number",
            ),
          )
          .map(([key]) => key),
      );
      out = out.filter((r) => keep.has(String(r[filter.field])));
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
        score: Number(aggregate(filter.aggregator, group, filter.measure) ?? 0),
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
        : filter.valueType === "time"
          ? timeOperatorLabels[filter.operator]
          : undefined;
    return `${filter.field} ${words ?? filter.operator} ${filter.value}${
      filter.value2 !== undefined ? ` – ${filter.value2}` : ""
    }`;
  }
  if (filter.kind === "subquery") {
    return `${filter.field} where ${filter.aggregator} of ${filter.measure} ${filter.operator} ${filter.value}${
      filter.value2 !== undefined ? ` – ${filter.value2}` : ""
    }`;
  }
  return `${filter.direction === "top" ? "Top" : "Bottom"} ${filter.count} ${filter.field} by ${filter.measure}`;
}
