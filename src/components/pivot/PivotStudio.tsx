import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyCalculatedFields } from "./calculated";
import { applyFilters } from "./filters";
import { getLocale } from "./locales";
import { secureRows, visibleFields, can } from "./security";
import { buildChartData } from "./analysis";
import { exportMatrix, matrixFromResult, printMatrix, copyMatrix } from "./export";
import type { ExportFormat } from "./export";
import { createDefaultConfig } from "./types";
import type { FieldDef, Permissions, PivotConfig, PivotRow } from "./types";
import { createLocalEngine, measureOf } from "./engines/local";
import { keyOf, emptyResult } from "./result";
import type { PivotEngineAdapter, PivotQuery, PivotResult } from "./result";
import { PivotToolbar } from "./ui/PivotToolbar";
import { PivotSidebar } from "./ui/PivotSidebar";
import { PivotChart } from "./ui/PivotChart";
import { DrillThroughDialog } from "./ui/DrillThroughDialog";
import { FieldListDialog } from "./ui/FieldListDialog";
import { GridFieldBar } from "./ui/GridFieldBar";
import { PivotGrid } from "./ui/PivotGrid";
import type { SelectionStats } from "./ui/PivotGrid";
import { DataSourceBar, suggestConfig } from "./ui/DataSourceBar";
import type { UploadedDataset } from "./ui/DataSourceBar";
import { formatNumber } from "./format";

export interface PivotStudioProps {
  /** Records to analyse (used by the local engine). */
  data: PivotRow[];
  /** Field metadata; inferred with `inferFields()` when omitted. */
  fields: FieldDef[];
  /** Aggregation engine; defaults to the in-browser one. */
  engine?: PivotEngineAdapter;
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
  /** Show the "upload your own file" data source bar. */
  allowFileUpload?: boolean;
  /** Backend uploader; when given, uploads go to the service instead of memory. */
  onUploadToBackend?: (file: File) => Promise<{ datasetId: string; rowCount: number; fields: FieldDef[] }>;
  /** Dataset handle for backend queries. */
  datasetId?: string;
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
  allowFileUpload = false,
  onUploadToBackend,
  datasetId,
  fieldsUi = "dialog",
}: PivotStudioProps) {
  const [internal, setInternal] = useState<PivotConfig>(() => createDefaultConfig(initialConfig));
  const config = controlled ?? internal;
  const [drill, setDrill] = useState<{ title: string; rows: PivotRow[] } | null>(null);
  const [status, setStatus] = useState("");
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [selection, setSelection] = useState<SelectionStats | null>(null);
  const [uploaded, setUploaded] = useState<UploadedDataset | null>(null);
  const [result, setResult] = useState<PivotResult>(() => emptyResult(measureOf(config.values)));
  const [engineError, setEngineError] = useState("");
  const requestId = useRef(0);

  const adapter = useMemo(() => engine ?? createLocalEngine(), [engine]);
  const readOnly = !can(permissions, "edit");
  const allowExport = can(permissions, "export");
  const allowDrillThrough = can(permissions, "drillThrough");
  const { strings } = getLocale(config.locale);

  const activeData = uploaded?.rows.length ? uploaded.rows : data;
  const activeFields = uploaded ? uploaded.fields : fields;
  const activeDatasetId = uploaded?.datasetId ?? datasetId;

  const update = useCallback(
    (patch: Partial<PivotConfig>) => {
      const next = { ...config, ...patch };
      if (!controlled) setInternal(next);
      onConfigChange?.(next);
    },
    [config, controlled, onConfigChange],
  );

  const safeFields = useMemo(() => visibleFields(activeFields, permissions), [activeFields, permissions]);
  const baseRows = useMemo(() => secureRows(activeData, permissions), [activeData, permissions]);
  const derivedRows = useMemo(
    () => applyFilters(applyCalculatedFields(baseRows, config.calculated), config.filters),
    [baseRows, config.calculated, config.filters],
  );

  const query: PivotQuery = useMemo(
    () => ({
      rows: config.rows,
      cols: config.cols,
      values: config.values,
      filters: config.filters,
      showSubTotals: config.showSubTotals,
      showGrandTotals: config.showGrandTotals,
      grandTotalsPosition: config.grandTotalsPosition,
      layout: config.layout,
      collapsed: config.collapsed,
      sort: config.sort,
      sorts: config.layout === "flat" ? config.sorts : undefined,
      locale: config.locale,
      datasetId: activeDatasetId,
    }),
    [config, activeDatasetId],
  );

  useEffect(() => {
    const id = ++requestId.current;
    let cancelled = false;
    adapter
      .query(query, derivedRows)
      .then((next) => {
        if (!cancelled && id === requestId.current) {
          setResult(next);
          setEngineError("");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setEngineError(e instanceof Error ? e.message : "The pivot service failed");
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, query, derivedRows]);

  const chart = useMemo(() => buildChartData(derivedRows, config), [derivedRows, config]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  const getMatrix = useCallback(
    () => matrixFromResult(result, config.locale, title),
    [result, config.locale, title],
  );

  const handleExport = (format: ExportFormat) => {
    const matrix = getMatrix();
    if (!matrix.body.length) return setStatus(strings.noData);
    exportMatrix(matrix, format);
    setStatus(`${strings.export}: ${format.toUpperCase()}`);
  };

  const openDrill = async (rowKey: string[], colKey: string[], label: string) => {
    const rows = await adapter.drillThrough({ rowKey, colKey, query }, derivedRows);
    setDrill({ title: label, rows });
  };

  const toggleCollapse = (key: string[]) => {
    const id = keyOf(key);
    const next = config.collapsed.includes(id)
      ? config.collapsed.filter((k) => k !== id)
      : [...config.collapsed, id];
    update({ collapsed: next });
  };

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
          onPrint={() => printMatrix(getMatrix())}
          onCopy={async () => {
            if (await copyMatrix(getMatrix())) setStatus("Copied");
          }}
          onReset={() => update(createDefaultConfig(initialConfig))}
          onOpenFields={fieldsUi === "dialog" ? () => setFieldsOpen(true) : undefined}
        />
      )}

      {allowFileUpload && (
        <DataSourceBar
          currentName={uploaded?.name ?? "Sample data"}
          rowCount={uploaded?.rows.length ?? data.length}
          isCustom={uploaded !== null}
          {...(onUploadToBackend ? { onUploadToBackend } : {})}
          onReset={() => {
            setUploaded(null);
            update(createDefaultConfig(initialConfig));
          }}
          onLoad={(dataset) => {
            setUploaded(dataset);
            update({ ...createDefaultConfig(), ...suggestConfig(dataset.fields), locale: config.locale });
            setStatus(`Loaded ${dataset.name}`);
          }}
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
            {result.meta.source === "backend" && " · aggregated by your analytics service"}
            {allowDrillThrough && " · click a number to see the records behind it"}
          </p>

          {engineError && (
            <p role="alert" className="px-1 pb-2 text-xs text-destructive">
              {engineError}
            </p>
          )}

          <PivotGrid
            result={result}
            layout={config.layout}
            locale={config.locale}
            theme={config.theme}
            title={title}
            showFieldCaptions={config.showFieldCaptions}
            showSpreadsheetHeaders={config.showSpreadsheetHeaders}
            repeatMemberLabels={config.repeatMemberLabels}
            showSortingControls={config.showSortingControls}
            showRowTotals={config.showRowTotals}
            sort={config.sort}
            sorts={config.layout === "flat" ? config.sorts : undefined}
            multiSort={config.layout === "flat"}
            onSortChange={(sort) => update({ sort, sorts: sort ? [sort] : [] })}
            onSortsChange={(sorts) => update({ sorts, sort: sorts[0] })}
            onToggleCollapse={toggleCollapse}
            conditionalFormats={config.conditionalFormats}
            allowDrillThrough={allowDrillThrough}
            onDrill={(rowKey, colKey, label) => void openDrill(rowKey, colKey, label)}
            onSelectionChange={setSelection}
            emptyLabel={strings.noData}
          />

          {selection && selection.count > 0 && (
            <p data-testid="selection-bar" className="mt-2 px-1 text-xs text-muted-foreground">
              {selection.count} cells · Sum {formatNumber(selection.sum, result.measure.format, config.locale)} ·
              Average {formatNumber(selection.average, result.measure.format, config.locale)} · Min{" "}
              {formatNumber(selection.min, result.measure.format, config.locale)} · Max{" "}
              {formatNumber(selection.max, result.measure.format, config.locale)}
            </p>
          )}

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
                    ? (point) => void openDrill([String(point.name)], [], String(point.name))
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
