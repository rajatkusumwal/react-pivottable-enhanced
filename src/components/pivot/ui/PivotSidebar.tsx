import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { aggregatorLabels } from "../aggregators";
import { uniqueMembers } from "../filters";
import { validateFormula } from "../calculated";
import type { PivotStrings } from "../locales";
import type {
  CalculatedField,
  ConditionOperator,
  FieldDef,
  FilterDef,
  PivotConfig,
  PivotRow,
  ValueDef,
} from "../types";

export interface PivotSidebarProps {
  strings: PivotStrings;
  fields: FieldDef[];
  rows: PivotRow[];
  config: PivotConfig;
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
}

type Area = "rows" | "cols" | "values" | "unused";

const chip =
  "inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground";
const section = "rounded-xl border border-border bg-card p-3";
const heading = "mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const control = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

export function PivotSidebar({
  strings,
  fields,
  rows,
  config,
  readOnly,
  onChange,
}: PivotSidebarProps) {
  const [query, setQuery] = useState("");
  const [formula, setFormula] = useState("([revenue] - [cost])");
  const [calcName, setCalcName] = useState("profit");
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const allFields = useMemo<FieldDef[]>(
    () => [
      ...fields,
      ...config.calculated.map<FieldDef>((c) => ({
        name: c.name,
        caption: c.caption ?? c.name,
        type: "number",
        folder: strings.calculatedValue,
      })),
    ],
    [fields, config.calculated, strings.calculatedValue],
  );

  const areaOf = (name: string): Area =>
    config.rows.includes(name)
      ? "rows"
      : config.cols.includes(name)
        ? "cols"
        : config.values.some((v) => v.field === name)
          ? "values"
          : "unused";

  const setArea = (field: FieldDef, area: Area) => {
    const next: Partial<PivotConfig> = {
      rows: config.rows.filter((f) => f !== field.name),
      cols: config.cols.filter((f) => f !== field.name),
      values: config.values.filter((v) => v.field !== field.name),
    };
    if (area === "rows") next.rows = [...(next.rows ?? []), field.name];
    if (area === "cols") next.cols = [...(next.cols ?? []), field.name];
    if (area === "values")
      next.values = [
        ...(next.values ?? []),
        { field: field.name, aggregator: field.type === "number" ? "sum" : "count" },
      ];
    onChange(next);
  };

  const folders = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const f of allFields) {
      if (query && !(f.caption ?? f.name).toLowerCase().includes(query.toLowerCase())) continue;
      const key = f.folder ?? "Fields";
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return [...map.entries()];
  }, [allFields, query]);

  const updateValue = (index: number, patch: Partial<ValueDef>) =>
    onChange({ values: config.values.map((v, i) => (i === index ? { ...v, ...patch } : v)) });

  const addFilter = (filter: FilterDef) => onChange({ filters: [...config.filters, filter] });
  const removeFilter = (index: number) =>
    onChange({ filters: config.filters.filter((_, i) => i !== index) });

  const addCalculated = () => {
    const error = validateFormula(formula);
    setFormulaError(error);
    if (error || !calcName.trim()) return;
    const next: CalculatedField = { name: calcName.trim(), formula, caption: calcName.trim() };
    onChange({
      calculated: [...config.calculated.filter((c) => c.name !== next.name), next],
    });
  };

  return (
    <aside className="flex w-full flex-col gap-3 lg:w-72" aria-label={strings.fields}>
      {/* Field list */}
      <div className={section}>
        <h3 className={heading}>{strings.fields}</h3>
        <input
          className={control}
          placeholder={`${strings.search}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={strings.search}
        />
        <div className="mt-2 max-h-64 space-y-3 overflow-y-auto pr-1">
          {folders.map(([folder, list]) => (
            <div key={folder}>
              <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">{folder}</p>
              <ul className="space-y-1">
                {list.map((f) => (
                  <li key={f.name} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm">{f.caption ?? f.name}</span>
                    <select
                      className="rounded-md border border-border bg-background px-1 py-0.5 text-xs"
                      aria-label={`Place ${f.caption ?? f.name}`}
                      disabled={readOnly}
                      value={areaOf(f.name)}
                      onChange={(e) => setArea(f, e.target.value as Area)}
                    >
                      <option value="unused">—</option>
                      <option value="rows">{strings.rows}</option>
                      <option value="cols">{strings.columns}</option>
                      <option value="values">{strings.values}</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className={section}>
        <h3 className={heading}>{strings.values}</h3>
        {config.values.length === 0 && (
          <p className="text-xs text-muted-foreground">Pick a number field above.</p>
        )}
        <ul className="space-y-2">
          {config.values.map((v, i) => (
            <li key={`${v.field}-${i}`} className="rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{v.caption ?? v.field}</span>
                <button
                  type="button"
                  aria-label={`Remove ${v.field}`}
                  disabled={readOnly}
                  onClick={() => onChange({ values: config.values.filter((_, j) => j !== i) })}
                >
                  <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <select
                  className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                  aria-label={`Aggregation for ${v.field}`}
                  disabled={readOnly}
                  value={v.aggregator}
                  onChange={(e) => updateValue(i, { aggregator: e.target.value })}
                >
                  {Object.entries(aggregatorLabels).map(([name, label]) => (
                    <option key={name} value={name}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                  aria-label={`Show ${v.field} as`}
                  disabled={readOnly}
                  value={v.displayMode ?? "raw"}
                  onChange={(e) =>
                    updateValue(i, {
                      displayMode: e.target.value as NonNullable<ValueDef["displayMode"]>,
                    })
                  }
                >
                  <option value="raw">Actual value</option>
                  <option value="percentOfGrandTotal">% of grand total</option>
                  <option value="percentOfRowTotal">% of row</option>
                  <option value="percentOfColumnTotal">% of column</option>
                  <option value="runningTotal">Running total</option>
                  <option value="index">Index</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Filters */}
      <FilterEditor
        strings={strings}
        fields={allFields}
        rows={rows}
        filters={config.filters}
        readOnly={readOnly}
        onAdd={addFilter}
        onRemove={removeFilter}
      />

      {/* Calculated values */}
      <div className={section}>
        <h3 className={heading}>{strings.calculatedValue}</h3>
        <div className="space-y-1.5">
          <input
            className={control}
            aria-label="Calculated field name"
            value={calcName}
            disabled={readOnly}
            onChange={(e) => setCalcName(e.target.value)}
          />
          <input
            className={`${control} font-mono text-xs`}
            aria-label="Formula"
            value={formula}
            disabled={readOnly}
            onChange={(e) => setFormula(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Use square brackets for fields, e.g. <code>[revenue] - [cost]</code>
          </p>
          {formulaError && <p className="text-xs text-destructive">{formulaError}</p>}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            onClick={addCalculated}
            disabled={readOnly}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
          </button>
        </div>
        {config.calculated.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {config.calculated.map((c) => (
              <li key={c.name} className={chip}>
                {c.name}
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  disabled={readOnly}
                  onClick={() =>
                    onChange({
                      calculated: config.calculated.filter((x) => x.name !== c.name),
                      values: config.values.filter((v) => v.field !== c.name),
                      rows: config.rows.filter((f) => f !== c.name),
                      cols: config.cols.filter((f) => f !== c.name),
                    })
                  }
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Options & style */}
      <div className={section}>
        <h3 className={heading}>{strings.options}</h3>
        <label className="flex items-center justify-between py-1 text-sm">
          {strings.grandTotals}
          <input
            type="checkbox"
            checked={config.showGrandTotals}
            disabled={readOnly}
            onChange={(e) => onChange({ showGrandTotals: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between py-1 text-sm">
          {strings.subtotals}
          <input
            type="checkbox"
            checked={config.showSubTotals}
            disabled={readOnly}
            onChange={(e) => onChange({ showSubTotals: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between py-1 text-sm">
          Striped rows
          <input
            type="checkbox"
            checked={config.theme.stripe}
            disabled={readOnly}
            onChange={(e) => onChange({ theme: { ...config.theme, stripe: e.target.checked } })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 py-1 text-sm">
          Density
          <select
            className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
            value={config.theme.density}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                theme: { ...config.theme, density: e.target.value as "compact" | "comfortable" },
              })
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 py-1 text-sm">
          Accent colour
          <input
            type="color"
            aria-label="Accent colour"
            value={config.theme.accent}
            disabled={readOnly}
            onChange={(e) => onChange({ theme: { ...config.theme, accent: e.target.value } })}
          />
        </label>
      </div>
    </aside>
  );
}

interface FilterEditorProps {
  strings: PivotStrings;
  fields: FieldDef[];
  rows: PivotRow[];
  filters: FilterDef[];
  readOnly: boolean;
  onAdd: (filter: FilterDef) => void;
  onRemove: (index: number) => void;
}

const operators: { value: ConditionOperator; label: string }[] = [
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "eq", label: "equals" },
  { value: "neq", label: "does not equal" },
  { value: "between", label: "between" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "does not contain" },
  { value: "beginsWith", label: "begins with" },
  { value: "endsWith", label: "ends with" },
];

function FilterEditor({ strings, fields, rows, filters, readOnly, onAdd, onRemove }: FilterEditorProps) {
  const [kind, setKind] = useState<FilterDef["kind"]>("values");
  const [field, setField] = useState(fields[0]?.name ?? "");
  const [members, setMembers] = useState<string[]>([]);
  const [operator, setOperator] = useState<ConditionOperator>("gt");
  const [value, setValue] = useState("0");
  const [value2, setValue2] = useState("0");
  const [count, setCount] = useState(5);
  const [measure, setMeasure] = useState(
    fields.find((f) => f.type === "number")?.name ?? fields[0]?.name ?? "",
  );

  const memberOptions = useMemo(() => (field ? uniqueMembers(rows, field).slice(0, 200) : []), [rows, field]);

  const submit = () => {
    if (!field) return;
    if (kind === "values") onAdd({ kind: "values", field, mode: "include", members });
    else if (kind === "condition")
      onAdd({ kind: "condition", field, operator, value, value2 });
    else
      onAdd({ kind: "top", field, measure, aggregator: "sum", direction: "top", count });
  };

  return (
    <div className={section}>
      <h3 className={heading}>{strings.filters}</h3>
      {filters.length > 0 && (
        <ul className="mb-2 space-y-1">
          {filters.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                {f.kind === "values"
                  ? `${f.field}: ${f.mode} ${f.members.length || "all"}`
                  : f.kind === "condition"
                    ? `${f.field} ${f.operator} ${f.value}`
                    : `${f.direction} ${f.count} ${f.field} by ${f.measure}`}
              </span>
              <button type="button" aria-label={`Remove filter ${i + 1}`} disabled={readOnly} onClick={() => onRemove(i)}>
                <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-1.5">
        <select
          className={control}
          aria-label="Filter type"
          value={kind}
          disabled={readOnly}
          onChange={(e) => setKind(e.target.value as FilterDef["kind"])}
        >
          <option value="values">Keep only chosen values</option>
          <option value="condition">Condition</option>
          <option value="top">Top / bottom N</option>
        </select>
        <select
          className={control}
          aria-label="Filter field"
          value={field}
          disabled={readOnly}
          onChange={(e) => {
            setField(e.target.value);
            setMembers([]);
          }}
        >
          {fields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.caption ?? f.name}
            </option>
          ))}
        </select>

        {kind === "values" && (
          <select
            className={`${control} h-28`}
            multiple
            aria-label="Values to keep"
            value={members}
            disabled={readOnly}
            onChange={(e) => setMembers(Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {memberOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}

        {kind === "condition" && (
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
              aria-label="Operator"
              value={operator}
              disabled={readOnly}
              onChange={(e) => setOperator(e.target.value as ConditionOperator)}
            >
              {operators.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
              aria-label="Filter value"
              value={value}
              disabled={readOnly}
              onChange={(e) => setValue(e.target.value)}
            />
            {operator === "between" && (
              <input
                className="col-span-2 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                aria-label="Second value"
                value={value2}
                disabled={readOnly}
                onChange={(e) => setValue2(e.target.value)}
              />
            )}
          </div>
        )}

        {kind === "top" && (
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              min={1}
              className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
              aria-label="How many"
              value={count}
              disabled={readOnly}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <select
              className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
              aria-label="Ranked by"
              value={measure}
              disabled={readOnly}
              onChange={(e) => setMeasure(e.target.value)}
            >
              {fields
                .filter((f) => f.type === "number")
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.caption ?? f.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
          onClick={submit}
          disabled={readOnly}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {strings.addFilter}
        </button>
      </div>
    </div>
  );
}
