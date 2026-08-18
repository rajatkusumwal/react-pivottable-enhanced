/**
 * Custom field labels ("rename a field").
 *
 * Two layers, both engine-agnostic:
 *  - `PivotConfig.fieldCaptions` renames a row/column field for this report.
 *  - `ValueDef.caption` renames one measure, so the same field can appear twice
 *    with different aggregations and different labels.
 */
import type { PivotResult } from "./result";
import type { FieldDef, PivotConfig, ValueDef } from "./types";

/** Label for a row/column field: report rename → data source caption → raw name. */
export function fieldCaption(
  name: string,
  fields: FieldDef[] = [],
  captions: Record<string, string> = {},
): string {
  const custom = captions[name]?.trim();
  if (custom) return custom;
  const meta = fields.find((f) => f.name === name);
  return meta?.caption?.trim() || name;
}

/** Label for a measure chip / column header. */
export function measureCaption(value: ValueDef, fields: FieldDef[] = [], captions = {}): string {
  return value.caption?.trim() || fieldCaption(value.field, fields, captions);
}

/** Patch that renames a row/column field (empty caption clears the rename). */
export function renameFieldPatch(
  config: PivotConfig,
  name: string,
  caption: string,
): Partial<PivotConfig> {
  const next = { ...(config.fieldCaptions ?? {}) };
  if (caption.trim()) next[name] = caption.trim();
  else delete next[name];
  return { fieldCaptions: next };
}

/** Patch that renames the measure at `index`. */
export function renameMeasurePatch(
  config: PivotConfig,
  index: number,
  caption: string,
): Partial<PivotConfig> {
  const values = config.values.map((v, i) => {
    if (i !== index) return v;
    const next = { ...v };
    if (caption.trim()) next.caption = caption.trim();
    else delete next.caption;
    return next;
  });
  return { values };
}

/**
 * Applies renames to a result so the grid, exports and print view show the
 * custom labels without the engines needing to know about them.
 */
export function renameResultFields(
  result: PivotResult,
  fields: FieldDef[] = [],
  captions: Record<string, string> = {},
): PivotResult {
  if (!Object.keys(captions).length && !fields.some((f) => f.caption)) return result;
  const label = (n: string) => fieldCaption(n, fields, captions);
  return {
    ...result,
    rowFields: result.rowFields.map(label),
    colFields: result.colFields.map(label),
  };
}
