import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyCalculatedFields } from "./calculated";
import { renameMeasurePatch, renameResultFields } from "./captions";
import { kpisFromFields } from "./kpi";
import { applyFilters } from "./filters";
import { applyCellEdit } from "./editing";
import { getLocale } from "./locales";
import { secureRows, visibleFields, can } from "./security";
import { buildChartData, chartDrillKeys } from "./analysis";
import { exportMatrix, matrixFromResult, printMatrix, copyMatrix } from "./export";
import type { ExportDecoration, ExportFormat } from "./export";
import { buildReportUrl, readReportFromUrl } from "./report-link";

import { createDefaultConfig } from "./types";
import type { FieldDef, Permissions, PivotConfig, PivotRow } from "./types";
import { createLocalEngine, measureOf } from "./engines/local";
import { keyOf, emptyResult } from "./result";
import type { PivotEngineAdapter, PivotQuery, PivotResult } from "./result";
import { PivotToolbar } from "./ui/PivotToolbar";
import { PivotSidebar } from "./ui/PivotSidebar";
import { PivotChart } from "./ui/PivotChart";
import { ChartFilterBar } from "./ui/ChartFilterBar";
import { ChartDrillBar } from "./ui/ChartDrillBar";
import { DrillThroughDialog } from "./ui/DrillThroughDialog";
import { FieldListDialog } from "./ui/FieldListDialog";
import { FormatDialog } from "./ui/FormatDialog";
import type { FormatTab } from "./ui/FormatDialog";
import { GridContextMenu } from "./ui/GridContextMenu";
import type { ContextMenuItem } from "./ui/GridContextMenu";
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
  /** Notified when inline editing writes new values back into the records. */
  onDataChange?: (rows: PivotRow[]) => void;
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
  onDataChange,
  onUploadToBackend,
  datasetId,
  fieldsUi = "dialog",
}: PivotStudioProps) {
  const [internal, setInternal] = useState<PivotConfig>(() => createDefaultConfig(initialConfig));
  const config = controlled ?? internal;
  const [drill, setDrill] = useState<{ title: string; rows: PivotRow[]; total: number } | null>(
    null,
  );
  const [status, setStatus] = useState("");
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatTab, setFormatTab] = useState<FormatTab>("number");
  const [fullscreen, setFullscreen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const [selection, setSelection] = useState<SelectionStats | null>(null);
  const [uploaded, setUploaded] = useState<UploadedDataset | null>(null);
  /** Records after inline edits; null while the source data is untouched. */
  const [editedRows, setEditedRows] = useState<PivotRow[] | null>(null);
  const [result, setResult] = useState<PivotResult>(() => emptyResult(measureOf(config.values)));
  const [engineError, setEngineError] = useState("");
  const requestId = useRef(0);

  const adapter = useMemo(() => engine ?? createLocalEngine(), [engine]);
  const readOnly = !can(permissions, "edit");
  const allowExport = can(permissions, "export");
  const allowDrillThrough = can(permissions, "drillThrough");
  const { strings } = getLocale(config.locale);

  const sourceData = uploaded?.rows.length ? uploaded.rows : data;
  const activeData = editedRows ?? sourceData;
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
      collapsedCols: config.collapsedCols,
      sort: config.sort,
      sorts: config.layout === "flat" ? config.sorts : undefined,
      locale: config.locale,
      calculated: config.calculated,
      kpis: kpisFromFields(safeFields),
      datasetId: activeDatasetId,
    }),
    [config, safeFields, activeDatasetId],
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

  useEffect(() => {
    setEditedRows(null);
  }, [data, uploaded]);

  const handleCellEdit = useCallback(
    (rowKey: string[], colKey: string[], value: number, measureIndex = 0) => {
      const value_ = config.values[measureIndex] ?? config.values[0];
      if (!value_) return setStatus("Add a measure before editing");
      if ((value_.type ?? "number") !== "number")
        return setStatus("Only number measures can be edited");
      const outcome = applyCellEdit(activeData, {
        rowFields: config.rows,
        colFields: config.cols,
        rowKey,
        // The measure caption is appended to column keys when several measures show.
        colKey: colKey.slice(0, config.cols.length),
        field: value_.field,
        aggregator: value_.aggregator,
        value,
      });
      if (!outcome.changed) return setStatus(outcome.reason ?? "Cell not editable");
      setEditedRows(outcome.rows);
      onDataChange?.(outcome.rows);
      setStatus("Cell updated");
    },
    [activeData, config.values, config.rows, config.cols, onDataChange],
  );


  const chart = useMemo(() => buildChartData(derivedRows, config), [derivedRows, config]);

  const patchChart = useCallback(
    (patch: Partial<PivotConfig["chart"]>) => update({ chart: { ...config.chart, ...patch } }),
    [config.chart, update],
  );

  /** Axis label click: drill one level deeper, or filter the report at the last level. */
  const handleCategoryClick = useCallback(
    (category: string) => {
      if (chart.canDrillCategory) {
        patchChart({ drillRows: [...chart.categoryPath, category] });
        return;
      }
      const field = chart.categoryField;
      if (!field || readOnly) return;
      const others = config.filters.filter((f) => !(f.kind === "values" && f.field === field));
      update({
        filters: [...others, { kind: "values", field, mode: "include", members: [category] }],
      });
      setStatus(`Filtered to ${category}`);
    },
    [chart, config.filters, patchChart, readOnly, update],
  );

  /** Legend click: drill the legend one level deeper, or hide/show the series. */
  const handleSeriesClick = useCallback(
    (series: string) => {
      if (chart.canDrillSeries) {
        patchChart({ drillCols: [...chart.seriesPath, series] });
        return;
      }
      const hidden = config.chart.hiddenSeries ?? [];
      patchChart({
        hiddenSeries: hidden.includes(series)
          ? hidden.filter((s) => s !== series)
          : [...hidden, series],
      });
    },
    [chart, config.chart.hiddenSeries, patchChart],
  );


  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  /** Header & footer printed on every export and on the print view. */
  const decoration: ExportDecoration = useMemo(
    () => ({ header: config.exportHeader, footer: config.exportFooter }),
    [config.exportHeader, config.exportFooter],
  );

  /** Result with custom field labels applied (renames live in the config). */
  const displayResult = useMemo(
    () => renameResultFields(result, safeFields, config.fieldCaptions ?? {}),
    [result, safeFields, config.fieldCaptions],
  );

  const getMatrix = useCallback(
    () => matrixFromResult(displayResult, config.locale, title, decoration),
    [displayResult, config.locale, title, decoration],
  );

  const handleExport = (format: ExportFormat) => {
    const matrix = getMatrix();
    if (!matrix.body.length) return setStatus(strings.noData);
    exportMatrix(matrix, format, config.csv);
    setStatus(`${strings.export}: ${format.toUpperCase()}`);
  };

  /** Copies a self-contained link that restores this exact report. */
  const shareLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = buildReportUrl(window.location.href, config);
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Report link copied to the clipboard");
    } catch {
      setStatus("Report link added to the address bar");
    }
  }, [config]);

  /** Restores a report carried in the URL on first render. */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || controlled || typeof window === "undefined") return;
    restored.current = true;
    const shared = readReportFromUrl(window.location.href);
    if (shared) {
      setInternal(shared);
      onConfigChange?.(shared);
      setStatus("Shared report loaded");
    }
  }, [controlled, onConfigChange]);

  /** Full-screen mode: the browser API when available, a fixed overlay otherwise. */
  const rootRef = useRef<HTMLElement>(null);
  const toggleFullscreen = useCallback(() => {
    const node = rootRef.current;
    if (node && typeof document !== "undefined" && document.fullscreenEnabled) {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void node.requestFullscreen?.().catch(() => undefined);
    }
    setFullscreen((f) => !f);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openDrill = async (rowKey: string[], colKey: string[], label: string) => {
    const slice = config.drillThrough ?? {};
    const all = await adapter.drillThrough({ rowKey, colKey, query }, derivedRows);
    const rows = await adapter.drillThrough(
      {
        rowKey,
        colKey,
        query,
        ...(slice.maxRows ? { limit: slice.maxRows } : {}),
        ...(slice.fields?.length ? { fields: slice.fields } : {}),
        ...(slice.sort ? { sort: slice.sort } : {}),
      },
      derivedRows,
    );
    setDrill({ title: label, rows, total: all.length });
  };


  const toggleCollapse = (key: string[]) => {
    const id = keyOf(key);
    const next = config.collapsed.includes(id)
      ? config.collapsed.filter((k) => k !== id)
      : [...config.collapsed, id];
    update({ collapsed: next });
  };

  const toggleColumnCollapse = (key: string[]) => {
    const id = keyOf(key);
    const current = config.collapsedCols ?? [];
    update({
      collapsedCols: current.includes(id) ? current.filter((k) => k !== id) : [...current, id],
    });
  };

  /** Drill up: collapse every top-level member on both axes. */
  const collapseAll = () => {
    const topRow = new Set(derivedRows.map((r) => String(r[config.rows[0] ?? ""] ?? "")));
    const topCol = new Set(derivedRows.map((r) => String(r[config.cols[0] ?? ""] ?? "")));
    update({
      collapsed: config.rows.length > 1 ? [...topRow].map((m) => keyOf([m])) : [],
      collapsedCols: config.cols.length > 1 ? [...topCol].map((m) => keyOf([m])) : [],
    });
  };

  /** Drill down: expand everything again. */
  const expandAll = () => update({ collapsed: [], collapsedCols: [] });

  /** Builds the right-click menu for a value cell. */
  const openContextMenu = (payload: {
    x: number;
    y: number;
    rowKey: string[];
    colKey: string[];
    label: string;
    value: unknown;
  }) => {
    const items: ContextMenuItem[] = [
      {
        id: "drill",
        label: strings.drillThrough,
        disabled: !allowDrillThrough,
        onSelect: () => void openDrill(payload.rowKey, payload.colKey, payload.label),
      },
      {
        id: "copy-cell",
        label: "Copy this value",
        onSelect: () => {
          void navigator.clipboard
            ?.writeText(String(payload.value ?? ""))
            .then(() => setStatus("Value copied"))
            .catch(() => setStatus("Copy is blocked by the browser"));
        },
      },
      {
        id: "copy-table",
        label: "Copy the whole table",
        disabled: !allowExport,
        onSelect: () => {
          void copyMatrix(getMatrix()).then((ok) => setStatus(ok ? "Copied" : "Copy failed"));
        },
      },
      {
        id: "export-csv",
        label: "Export to CSV",
        disabled: !allowExport,
        onSelect: () => handleExport("csv"),
      },
      {
        id: "number-format",
        label: "Number formatting…",
        onSelect: () => {
          setFormatTab("number");
          setFormatOpen(true);
        },
      },
      {
        id: "conditional-format",
        label: "Conditional formatting…",
        onSelect: () => {
          setFormatTab("conditional");
          setFormatOpen(true);
        },
      },
      {
        id: "rename-measure",
        label: "Rename measure…",
        disabled: readOnly || !config.values.length,
        onSelect: () => {
          const index = Math.max(
            0,
            config.values.findIndex((v, i) =>
              payload.colKey.includes(v.caption ?? result.measures?.[i]?.caption ?? v.field),
            ),
          );
          const value = config.values[index];
          if (!value) return;
          const next = window.prompt("New label for this measure", value.caption ?? value.field);
          if (next !== null) update(renameMeasurePatch(config, index, next));
        },
      },
      { id: "expand-all", label: "Drill down all levels", onSelect: expandAll },
      { id: "collapse-all", label: "Drill up to top level", onSelect: collapseAll },
    ];
    setMenu({ x: payload.x, y: payload.y, items });
  };

  return (
    <section
      ref={rootRef}
      data-testid="pivot-studio"
      data-fullscreen={fullscreen ? "true" : undefined}

      className={`flex flex-col gap-3 ${
        fullscreen ? "fixed inset-0 z-40 overflow-auto bg-background p-3" : ""
      } ${className}`}
      aria-label={title}
    >
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
          onOpenFormat={() => {
            setFormatTab("number");
            setFormatOpen(true);
          }}
          onShare={() => void shareLink()}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={fullscreen}
        />
      )}


      {allowFileUpload && (
        <DataSourceBar
          csv={config.csv}
          onCsvChange={(csv) => update({ csv })}
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
              fields={safeFields}
              rows={baseRows}
              readOnly={readOnly}
              onChange={update}
              onOpenFields={() => setFieldsOpen(true)}
            />
          )}
          <div
            data-testid="pivot-panes"
            data-split={config.chart.visible && config.chart.position === "right" ? "true" : "false"}
            className={
              config.chart.visible && config.chart.position === "right"
                ? "flex flex-col gap-3 xl:flex-row"
                : ""
            }
          >
            <div className="min-w-0 flex-1">
          {(config.rows.length > 1 || config.cols.length > 1) && config.layout !== "flat" && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
              <button
                type="button"
                className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
                onClick={expandAll}
              >
                Drill down all levels
              </button>
              <button
                type="button"
                className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
                onClick={collapseAll}
              >
                Drill up to top level
              </button>
              <span className="text-xs text-muted-foreground">
                or use the arrows in row and column headers
              </span>
            </div>
          )}
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {derivedRows.length} {strings.records}
            {result.meta.source === "backend" && " · aggregated by your analytics service"}
            {allowDrillThrough && !config.editing && " · click a number to see the records behind it"}
            {config.editing && !readOnly && " · double-click a number to edit it"}
          </p>

          {engineError && (
            <p role="alert" className="px-1 pb-2 text-xs text-destructive">
              {engineError}
            </p>
          )}

          <PivotGrid
            result={displayResult}
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
            onToggleColumnCollapse={toggleColumnCollapse}
            conditionalFormats={config.conditionalFormats}
            allowDrillThrough={allowDrillThrough}
            editable={config.editing && !readOnly}
            onCellEdit={handleCellEdit}
            onDrill={(rowKey, colKey, label) => void openDrill(rowKey, colKey, label)}
            onCellContextMenu={openContextMenu}

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
            </div>

          {config.chart.visible && (
            <div
              data-testid="pivot-chart-pane"
              className={
                config.chart.position === "right"
                  ? "min-w-0 border-t border-border pt-3 xl:w-[45%] xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0"
                  : "mt-3 border-t border-border pt-3"
              }
            >
              {config.showChartFilters && (
                <ChartFilterBar
                  strings={strings}
                  config={config}
                  rows={baseRows}
                  readOnly={readOnly}
                  onChange={update}
                />
              )}
              <ChartDrillBar
                categoryPath={chart.categoryPath}
                seriesPath={chart.seriesPath}
                categoryField={chart.categoryField}
                seriesField={chart.seriesField}
                onCategoryUp={(level) => patchChart({ drillRows: chart.categoryPath.slice(0, level) })}
                onSeriesUp={(level) => patchChart({ drillCols: chart.seriesPath.slice(0, level) })}
                hint="Click an axis label to drill down · click a legend entry to expand or hide a series"
              />
              <PivotChart
                data={chart.data}
                series={chart.series}
                allSeries={chart.allSeries}
                hiddenSeries={config.chart.hiddenSeries ?? []}
                lineSeries={config.chart.lineSeries ?? []}
                type={config.chart.type}
                accent={config.theme.accent}
                emptyLabel={strings.noData}
                onCategoryClick={handleCategoryClick}
                onSeriesClick={handleSeriesClick}
                onPointClick={
                  allowDrillThrough
                    ? (point, series) => {
                        const keys = chartDrillKeys(chart, String(point.name), series);
                        void openDrill(keys.rowKey, keys.colKey, keys.label);
                      }
                    : undefined
                }
              />
            </div>
          )}
          </div>
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

      <FormatDialog
        key={formatTab}
        open={formatOpen}

        strings={strings}
        config={config}
        fields={safeFields}
        readOnly={readOnly}
        onChange={update}
        initialTab={formatTab}
        onClose={() => setFormatOpen(false)}
      />

      {menu && (
        <GridContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
      )}

      <DrillThroughDialog
        open={drill !== null}
        title={drill?.title ?? ""}
        rows={drill?.rows ?? []}
        total={drill?.total ?? 0}
        strings={strings}
        canExport={allowExport}
        decoration={decoration}
        fields={config.drillThrough?.fields}
        {...(config.drillThrough?.maxRows ? { maxRows: config.drillThrough.maxRows } : {})}
        sort={config.drillThrough?.sort}
        onFieldsChange={
          readOnly
            ? undefined
            : (fields) => update({ drillThrough: { ...(config.drillThrough ?? {}), fields } })
        }
        onSortChange={(sort) =>
          update({ drillThrough: { ...(config.drillThrough ?? {}), sort } })
        }
        onStatus={setStatus}
        onClose={() => setDrill(null)}
      />

    </section>
  );
}
