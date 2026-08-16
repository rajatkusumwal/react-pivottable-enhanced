import { BarChart3, Download, Printer, Table2, Copy, RotateCcw } from "lucide-react";
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
}

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-secondary disabled:opacity-50";

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
}: PivotToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2">
      <div className="inline-flex overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          aria-pressed={!config.chart.visible}
          onClick={() => onChange({ chart: { ...config.chart, visible: false } })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
            !config.chart.visible ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          <Table2 className="h-4 w-4" aria-hidden="true" />
          {strings.grid}
        </button>
        <button
          type="button"
          aria-pressed={config.chart.visible}
          onClick={() => onChange({ chart: { ...config.chart, visible: true } })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
            config.chart.visible ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          {strings.chart}
        </button>
      </div>

      {config.chart.visible && (
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="sr-only">Chart type</span>
          <select
            aria-label="Chart type"
            value={config.chart.type}
            onChange={(e) =>
              onChange({ chart: { ...config.chart, type: e.target.value as PivotConfig["chart"]["type"] } })
            }
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
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

      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{strings.export}</span>
        <select
          aria-label={strings.export}
          disabled={!canExport}
          value=""
          onChange={(e) => {
            if (e.target.value) onExport(e.target.value as ExportFormat);
            e.target.value = "";
          }}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm disabled:opacity-50"
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
        <Printer className="h-4 w-4" aria-hidden="true" />
        {strings.print} / PDF
      </button>

      <button type="button" className={btn} onClick={onCopy} disabled={!canExport}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy
      </button>

      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="sr-only">Language</span>
        <select
          aria-label="Language"
          value={config.locale}
          onChange={(e) => onChange({ locale: e.target.value })}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
        >
          {Object.entries(locales).map(([code, l]) => (
            <option key={code} value={code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className={btn} onClick={onReset} disabled={readOnly}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {strings.clear}
      </button>
    </div>
  );
}
