import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyCalculatedFields } from "./calculated";
import { applyFilters } from "./filters";
import { getLocale } from "./locales";
import { secureRows, visibleFields, can } from "./security";
import { buildChartData } from "./analysis";
import { exportMatrix, matrixFromTable, printMatrix, copyMatrix } from "./export";
import type { ExportFormat } from "./export";
import { createDefaultConfig } from "./types";
import type { FieldDef, Permissions, PivotConfig, PivotRow } from "./types";
import { PivotToolbar } from "./ui/PivotToolbar";
import { PivotSidebar } from "./ui/PivotSidebar";
import { PivotChart } from "./ui/PivotChart";
import { DrillThroughDialog } from "./ui/DrillThroughDialog";
import { FieldListDialog } from "./ui/FieldListDialog";
import { GridFieldBar } from "./ui/GridFieldBar";
import { ReactPivottablePanel } from "./engines/ReactPivottablePanel";
import { OrbPanel } from "./engines/OrbPanel";

export type PivotEngine = "react-pivottable" | "orb";

export interface PivotStudioProps {
  /** Records to analyse. */
  data: PivotRow[];
  /** Field metadata; inferred with `inferFields()` when omitted. */
  fields: FieldDef[];
  /** Which open-source engine renders the grid. */
  engine: PivotEngine;
  /** Starting configuration (uncontrolled). */
  initialConfig?: Partial<PivotConfig>;
  /** Fully controlled configuration. */
  config?: PivotConfig;
  onConfigChange?: (config: PivotConfig) => void;
  permissions?: Permissions;
  title?: string;
  className?: string;
  /** Hide the left panel when the host app supplies its own controls. */
  showSidebar?: boolean;
  showToolbar?: boolean;
  /**
   * "dialog" (default) reproduces Flexmonster: a field bar above the grid plus a
   * popup field list. "sidebar" keeps the docked panel.
   */
  fieldsUi?: "dialog" | "sidebar";
}

export function PivotStudio({
  data,
  fields,
  engine,
  initialConfig,
  config: controlled,
  onConfigChange,
  permissions,
  title = "Pivot table",
  className = "",
  showSidebar = true,
  showToolbar = true,
  fieldsUi = "dialog",
}: PivotStudioProps) {
  const [internal, setInternal] = useState<PivotConfig>(() => createDefaultConfig(initialConfig));
  const config = controlled ?? internal;
  const gridRef = useRef<HTMLDivElement>(null);
  const [drill, setDrill] = useState<{ title: string; rows: PivotRow[] } | null>(null);
  const [status, setStatus] = useState("");
  const [fieldsOpen, setFieldsOpen] = useState(false);

  const readOnly = !can(permissions, "edit");
  const allowExport = can(permissions, "export");
  const allowDrillThrough = can(permissions, "drillThrough");
  const { strings } = getLocale(config.locale);

  const update = useCallback(
    (patch: Partial<PivotConfig>) => {
      const next = { ...config, ...patch };
      if (!controlled) setInternal(next);
      onConfigChange?.(next);
    },
    [config, controlled, onConfigChange],
  );

  const safeFields = useMemo(() => visibleFields(fields, permissions), [fields, permissions]);
  const baseRows = useMemo(() => secureRows(data, permissions), [data, permissions]);
  const derivedRows = useMemo(
    () => applyFilters(applyCalculatedFields(baseRows, config.calculated), config.filters),
    [baseRows, config.calculated, config.filters],
  );

  const chart = useMemo(() => buildChartData(derivedRows, config), [derivedRows, config]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  const getMatrix = () => {
    const table = gridRef.current?.querySelector("table");
    return table ? matrixFromTable(table as HTMLTableElement, title) : null;
  };

  const handleExport = (format: ExportFormat) => {
    const matrix = getMatrix();
    if (!matrix) return setStatus(strings.noData);
    exportMatrix(matrix, format);
    setStatus(`${strings.export}: ${format.toUpperCase()}`);
  };

  const openDrill = (label: string, rows: PivotRow[]) => setDrill({ title: label, rows });

  return (
    <section className={`flex flex-col gap-3 ${className}`} aria-label={title}>
      {showToolbar && (
        <PivotToolbar
          strings={strings}
          config={config}
          canExport={allowExport}
          readOnly={readOnly}
          onChange={update}
          onExport={handleExport}
          onPrint={() => {
            const matrix = getMatrix();
            if (matrix) printMatrix(matrix);
          }}
          onCopy={async () => {
            const matrix = getMatrix();
            if (matrix && (await copyMatrix(matrix))) setStatus("Copied");
          }}
          onReset={() => update(createDefaultConfig(initialConfig))}
          onOpenFields={fieldsUi === "dialog" ? () => setFieldsOpen(true) : undefined}
        />
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        {showSidebar && fieldsUi === "sidebar" && (
          <PivotSidebar
            strings={strings}
            fields={safeFields}
            rows={baseRows}
            config={config}
            readOnly={readOnly}
            onChange={update}
          />
        )}

        <div className="min-w-0 flex-1 rounded-md border border-border bg-card p-2">
          {fieldsUi === "dialog" && (
            <GridFieldBar
              strings={strings}
              config={config}
              rows={baseRows}
              readOnly={readOnly}
              onChange={update}
              onOpenFields={() => setFieldsOpen(true)}
            />
          )}
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {derivedRows.length} {strings.records}
            {allowDrillThrough && " · click a number to see the records behind it"}
          </p>
          <div ref={gridRef} className="max-h-[70vh] overflow-auto">
            {engine === "react-pivottable" ? (
              <ReactPivottablePanel
                rows={derivedRows}
                config={config}
                allowDrillThrough={allowDrillThrough}
                onDrill={openDrill}
              />
            ) : (
              <OrbPanel
                rows={derivedRows}
                config={config}
                strings={strings}
                allowDrillThrough={allowDrillThrough}
                onDrill={openDrill}
              />
            )}
          </div>

          {config.chart.visible && (
            <div className="mt-3 border-t border-border pt-3">
              <PivotChart
                data={chart.data}
                series={chart.series}
                type={config.chart.type}
                accent={config.theme.accent}
                emptyLabel={strings.noData}
                onPointClick={
                  allowDrillThrough
                    ? (point) => {
                        const rowField = config.rows[0];
                        const records = rowField
                          ? derivedRows.filter((r) => String(r[rowField] ?? "") === point.name)
                          : derivedRows;
                        openDrill(String(point.name), records);
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {status}
      </p>

      <FieldListDialog
        open={fieldsOpen}
        strings={strings}
        fields={safeFields}
        rows={baseRows}
        config={config}
        readOnly={readOnly}
        onChange={update}
        onClose={() => setFieldsOpen(false)}
      />

      <DrillThroughDialog
        open={drill !== null}
        title={drill?.title ?? ""}
        rows={drill?.rows ?? []}
        strings={strings}
        onClose={() => setDrill(null)}
      />
    </section>
  );
}
