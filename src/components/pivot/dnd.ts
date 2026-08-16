/**
 * Pure helpers behind the Flexmonster-style drag & drop field list.
 * Keeping the move logic here means it can be unit tested without a DOM.
 */
import type { FieldDef, FilterDef, PivotConfig } from "./types";

/** The five buckets a field can live in, mirroring Flexmonster's field list. */
export type PivotArea = "fields" | "filters" | "rows" | "cols" | "values";

export const pivotAreas: PivotArea[] = ["filters", "cols", "rows", "values"];

export function areaOfField(config: PivotConfig, name: string): PivotArea {
  if (config.rows.includes(name)) return "rows";
  if (config.cols.includes(name)) return "cols";
  if (config.values.some((v) => v.field === name)) return "values";
  if (config.filters.some((f) => f.field === name)) return "filters";
  return "fields";
}

const insert = <T,>(list: T[], item: T, index?: number): T[] => {
  const next = [...list];
  next.splice(index === undefined || index < 0 ? next.length : index, 0, item);
  return next;
};

/**
 * Moves a field into an area and returns the config patch.
 * Dropping onto "fields" removes the field from the report.
 */
export function moveField(
  config: PivotConfig,
  name: string,
  target: PivotArea,
  index?: number,
  fieldType: FieldDef["type"] = "string",
): Partial<PivotConfig> {
  const existingValue = config.values.find((v) => v.field === name);
  const existingFilter = config.filters.find((f) => f.field === name);

  const patch: Partial<PivotConfig> = {
    rows: config.rows.filter((f) => f !== name),
    cols: config.cols.filter((f) => f !== name),
    values: config.values.filter((v) => v.field !== name),
    filters: config.filters.filter((f) => f.field !== name),
  };

  if (target === "rows") patch.rows = insert(patch.rows ?? [], name, index);
  if (target === "cols") patch.cols = insert(patch.cols ?? [], name, index);
  if (target === "values") {
    patch.values = insert(
      patch.values ?? [],
      existingValue ?? { field: name, aggregator: fieldType === "number" ? "sum" : "count" },
      index,
    );
  }
  if (target === "filters") {
    const filter: FilterDef = existingFilter ?? {
      kind: "values",
      field: name,
      mode: "include",
      members: [],
    };
    patch.filters = insert(patch.filters ?? [], filter, index);
  }
  return patch;
}

/** Removes a field from every area of the report. */
export function removeField(config: PivotConfig, name: string): Partial<PivotConfig> {
  return moveField(config, name, "fields");
}

/** Sorts a field within its own area (drag to reorder). */
export function reorderField(
  config: PivotConfig,
  area: PivotArea,
  from: number,
  to: number,
): Partial<PivotConfig> {
  const move = <T,>(list: T[]): T[] => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    if (item === undefined) return list;
    next.splice(to, 0, item);
    return next;
  };
  if (area === "rows") return { rows: move(config.rows) };
  if (area === "cols") return { cols: move(config.cols) };
  if (area === "values") return { values: move(config.values) };
  if (area === "filters") return { filters: move(config.filters) };
  return {};
}
