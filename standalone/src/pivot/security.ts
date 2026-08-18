import type { FieldDef, Permissions, PivotRow } from "./types";

export const defaultPermissions: Permissions = {
  allowExport: true,
  allowDrillThrough: true,
  readOnly: false,
};

/** Removes fields the current user is not allowed to see. */
export function visibleFields(fields: FieldDef[], perms: Permissions = {}): FieldDef[] {
  const denied = new Set(perms.deniedFields ?? []);
  return fields.filter(
    (f) => !denied.has(f.name) && (!perms.allowedFields || perms.allowedFields.includes(f.name)),
  );
}

/** Applies row-level security, drops denied columns and masks sensitive ones. */
export function secureRows(rows: PivotRow[], perms: Permissions = {}): PivotRow[] {
  const denied = new Set(perms.deniedFields ?? []);
  const masked = new Set(perms.maskedFields ?? []);
  const filtered = perms.rowFilter ? rows.filter(perms.rowFilter) : rows;
  if (!denied.size && !masked.size && !perms.allowedFields) return filtered;
  return filtered.map((row) => {
    const next: PivotRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (denied.has(key)) continue;
      if (perms.allowedFields && !perms.allowedFields.includes(key)) continue;
      next[key] = masked.has(key) ? "••••" : value;
    }
    return next;
  });
}

export function can(perms: Permissions | undefined, action: "export" | "drillThrough" | "edit") {
  const p = { ...defaultPermissions, ...perms };
  if (action === "export") return p.allowExport !== false;
  if (action === "drillThrough") return p.allowDrillThrough !== false;
  return p.readOnly !== true;
}
