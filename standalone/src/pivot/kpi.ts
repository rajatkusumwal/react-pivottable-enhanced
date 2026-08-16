import type { KpiDef, KpiStatus } from "./types";

/**
 * KPIs declared by the data source: a measure is compared with a goal (another
 * field, aggregated the same way, or a fixed number) and gets a traffic-light
 * state the grid renders next to the value.
 */

export const DEFAULT_KPI_WARNING = 0.9;

export function computeKpiStatus(
  value: number | null,
  goal: number | null,
  kpi: KpiDef,
): KpiStatus | null {
  if (value === null || goal === null || !Number.isFinite(goal) || goal === 0) return null;
  const higherIsBetter = (kpi.direction ?? "higher") === "higher";
  const ratio = higherIsBetter ? value / goal : goal / value;
  if (!Number.isFinite(ratio)) return null;
  const warningAt = kpi.warningAt ?? DEFAULT_KPI_WARNING;
  const state = ratio >= 1 ? "onTarget" : ratio >= warningAt ? "atRisk" : "below";
  return { state, ratio, goal };
}

export const KPI_LABELS: Record<KpiStatus["state"], string> = {
  onTarget: "On target",
  atRisk: "At risk",
  below: "Below target",
};

export const KPI_ICONS: Record<KpiStatus["state"], string> = {
  onTarget: "▲",
  atRisk: "■",
  below: "▼",
};

/** Collects the KPI metadata the engine needs from the field list. */
export function kpisFromFields(
  fields: { name: string; kpi?: KpiDef }[],
): Record<string, KpiDef> {
  const out: Record<string, KpiDef> = {};
  for (const field of fields) if (field.kpi) out[field.name] = field.kpi;
  return out;
}
