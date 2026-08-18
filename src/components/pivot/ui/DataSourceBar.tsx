/**
 * Data source bar: upload a CSV/JSON file or go back to the sample data.
 *
 * With the local engine the file never leaves the browser. When a backend
 * uploader is supplied, the same control posts the file to the service and the
 * returned dataset id is used for subsequent queries.
 */
import { useRef, useState } from "react";
import { FileUp, RotateCcw, Table2 } from "lucide-react";
import { inferFields, readFileAsRows } from "../data-sources";
import { defaultCsvOptions, type CsvOptions } from "../csv";
import type { FieldDef, PivotRow } from "../types";

const MAX_BYTES = 25 * 1024 * 1024;

export interface UploadedDataset {
  name: string;
  rows: PivotRow[];
  fields: FieldDef[];
  datasetId?: string;
}

export interface DataSourceBarProps {
  currentName: string;
  rowCount: number;
  onLoad: (dataset: UploadedDataset) => void;
  onReset: () => void;
  /** Optional backend uploader (Spring Boot + DuckDB). */
  onUploadToBackend?: (
    file: File,
  ) => Promise<{ datasetId: string; rowCount: number; fields: FieldDef[] }>;
  isCustom: boolean;
  /** CSV dialect used for reading files and writing CSV exports. */
  csv?: CsvOptions;
  onCsvChange?: (csv: CsvOptions) => void;
}

export function DataSourceBar({
  currentName,
  rowCount,
  onLoad,
  onReset,
  onUploadToBackend,
  isCustom,
  csv = defaultCsvOptions,
  onCsvChange,
}: DataSourceBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (file.size > MAX_BYTES) {
      setError(
        "That file is larger than 25 MB. Try a smaller extract, or point the app at the backend service.",
      );
      return;
    }
    if (!/\.(csv|json)$/i.test(file.name)) {
      setError("Please choose a .csv or .json file.");
      return;
    }
    setBusy(true);
    try {
      if (onUploadToBackend) {
        const meta = await onUploadToBackend(file);
        onLoad({ name: file.name, rows: [], fields: meta.fields, datasetId: meta.datasetId });
        return;
      }
      const rows = await readFileAsRows(file, csv);
      if (!rows.length) {
        setError("That file has no rows in it.");
        return;
      }
      const fields = inferFields(rows);
      if (!fields.length) {
        setError("That file has no columns we can read.");
        return;
      }
      onLoad({ name: file.name, rows, fields });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not read that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="data-source-bar"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
        dragging ? "border-primary bg-accent" : "border-border bg-surface"
      }`}
    >
      <Table2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="font-medium text-foreground">{currentName}</span>
      <span className="text-muted-foreground">{rowCount.toLocaleString()} rows</span>

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="sr-only"
        aria-label="Upload a CSV or JSON file"
        onChange={(e) => void handleFile(e.target.files?.[0] ?? undefined)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 hover:bg-accent disabled:opacity-50"
      >
        <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
        {busy ? "Reading…" : "Choose file"}
      </button>
      <span className="text-muted-foreground">or drop a .csv / .json here</span>

      {isCustom && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Use sample data
        </button>
      )}

      {onCsvChange && (
        <span className="flex items-center gap-1.5" data-testid="csv-options">
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <span className="text-muted-foreground">CSV</span>
          <label className="sr-only" htmlFor="csv-delimiter">
            CSV separator
          </label>
          <select
            id="csv-delimiter"
            value={csv.delimiter}
            onChange={(e) => onCsvChange({ ...csv, delimiter: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1"
          >
            <option value=",">Comma ,</option>
            <option value=";">Semicolon ;</option>
            <option value={"\t"}>Tab</option>
            <option value="|">Pipe |</option>
          </select>
          <label className="sr-only" htmlFor="csv-decimal">
            Decimal mark
          </label>
          <select
            id="csv-decimal"
            value={csv.decimalSeparator}
            onChange={(e) => onCsvChange({ ...csv, decimalSeparator: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1"
          >
            <option value=".">Decimal .</option>
            <option value=",">Decimal ,</option>
          </select>
          <label className="sr-only" htmlFor="csv-thousands">
            Thousands mark
          </label>
          <select
            id="csv-thousands"
            value={csv.thousandsSeparator}
            onChange={(e) => onCsvChange({ ...csv, thousandsSeparator: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1"
          >
            <option value="">No thousands</option>
            <option value=",">Thousands ,</option>
            <option value=".">Thousands .</option>
            <option value=" ">Thousands space</option>
          </select>
        </span>
      )}

      <span className="ml-auto text-muted-foreground">
        {onUploadToBackend ? "Sent to your analytics service" : "Stays in your browser"}
      </span>

      {error && (
        <p role="alert" className="w-full text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Picks a sensible first report for a freshly uploaded file: the first text
 * column on rows, the first numeric column summed.
 */
export function suggestConfig(fields: FieldDef[]) {
  const text = fields.filter((f) => f.type === "string");
  const numeric = fields.filter((f) => f.type === "number");
  return {
    rows: text[0] ? [text[0].name] : [],
    cols: text[1] ? [text[1].name] : [],
    values: numeric[0]
      ? [
          {
            field: numeric[0].name,
            aggregator: "sum" as const,
            caption: numeric[0].caption ?? numeric[0].name,
            format: { decimals: 0 },
          },
        ]
      : [],
  };
}
