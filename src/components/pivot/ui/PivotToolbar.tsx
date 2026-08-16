import {
  BarChart3,
  Copy,
  Download,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Table2,
} from "lucide-react";
import type { ExportFormat } from "../export";
import type { PivotConfig } from "../types";
import { locales } from "../locales";
import type { PivotStrings } from "../locales";

export interface PivotToolbarProps {
  strings: PivotStrings;
  config: PivotConfig;
  canExport: boolean;
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
  onExport: (format: ExportFormat) => void;
  onPrint: () => void;
  onCopy: () => void;
  onReset: () => void;
  /** Opens the Flexmonster-style field list dialog. */
  onOpenFields?: (() => void) | undefined;
}

const btn =
  "inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-50";
const select =
  "rounded border border-border bg-card px-2 py-1 text-xs disabled:opacity-50";

export function PivotToolbar({
  strings,
  config,
  canExport,
  readOnly,
  onChange,
  onExport,
  onPrint,
  onCopy,
  onReset,
  onOpenFields,
}: PivotToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5">
      {onOpenFields && (
        <button type="button" className={btn} onClick={onOpenFields}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {strings.fields}
        </button>
      )}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <div className="inline-flex overflow-hidden rounded border border-border">
        <button
          type="button"
          aria-pressed={!config.chart.visible}
          onClick={() => onChange({ chart: { ...config.chart, visible: false } })}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ${
            !config.chart.visible ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
          {strings.grid}
        </button>
        <button
          type="button"
          aria-pressed={config.chart.visible}
          onClick={() => onChange({ chart: { ...config.chart, visible: true } })}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ${
            config.chart.visible ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          {strings.chart}
        </button>
      </div>

      {config.chart.visible && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="sr-only">Chart type</span>
          <select
            aria-label="Chart type"
            value={config.chart.type}
            onChange={(e) =>
              onChange({ chart: { ...config.chart, type: e.target.value as PivotConfig["chart"]["type"] } })
            }
            className={select}
          >
            <option value="bar">Bars</option>
            <option value="stackedBar">Stacked bars</option>
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="pie">Pie</option>
          </select>
        </label>
      )}

      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="sr-only">Layout</span>
        <select
          aria-label="Layout"
          value={config.layout}
          onChange={(e) => onChange({ layout: e.target.value as PivotConfig["layout"] })}
          className={select}
        >
          <option value="compact">Compact form</option>
          <option value="classic">Classic form</option>
          <option value="flat">Flat form</option>
        </select>
      </label>

      {config.layout === "flat" && (
        <span className="text-[11px] text-muted-foreground">
          Shift-click a sort arrow to sort by several columns
        </span>
      )}

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={config.showSubTotals}
          onChange={(e) => onChange({ showSubTotals: e.target.checked })}
        />
        Subtotals
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={config.showGrandTotals}
          onChange={(e) => onChange({ showGrandTotals: e.target.checked })}
        />
        Grand totals
      </label>
      {config.showGrandTotals && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="sr-only">Grand totals position</span>
          <select
            aria-label="Grand totals position"
            value={config.grandTotalsPosition}
            onChange={(e) =>
              onChange({ grandTotalsPosition: e.target.value as PivotConfig["grandTotalsPosition"] })
            }
            className={select}
          >
            <option value="bottom">Totals at bottom</option>
            <option value="top">Totals at top</option>
          </select>
        </label>
      )}

      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{strings.export}</span>
        <select
          aria-label={strings.export}
          disabled={!canExport}
          value=""
          onChange={(e) => {
            if (e.target.value) onExport(e.target.value as ExportFormat);
            e.target.value = "";
          }}
          className={select}
        >
          <option value="">{strings.export}…</option>
          <option value="excel">Excel (.xls)</option>
          <option value="csv">CSV</option>
          <option value="tsv">TSV</option>
          <option value="html">HTML</option>
          <option value="json">JSON</option>
        </select>
      </label>

      <button type="button" className={btn} onClick={onPrint} disabled={!canExport}>
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        {strings.print} / PDF
      </button>

      <button type="button" className={btn} onClick={onCopy} disabled={!canExport}>
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        Copy
      </button>

      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="sr-only">Language</span>
        <select
          aria-label="Language"
          value={config.locale}
          onChange={(e) => onChange({ locale: e.target.value })}
          className={select}
        >
          {Object.entries(locales).map(([code, l]) => (
            <option key={code} value={code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className={btn} onClick={onReset} disabled={readOnly}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        {strings.clear}
      </button>
    </div>
  );
}
