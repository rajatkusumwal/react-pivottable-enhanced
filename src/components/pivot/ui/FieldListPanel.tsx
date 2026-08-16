import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Plus, Sigma } from "lucide-react";
import { aggregatorLabels } from "../aggregators";
import { validateFormula } from "../calculated";
import { areaOfField, moveField, reorderField } from "../dnd";
import type { PivotArea } from "../dnd";
import type { PivotStrings } from "../locales";
import type { CalculatedField, FieldDef, FilterDef, PivotConfig, PivotRow, ValueDef } from "../types";
import { FieldChip } from "./FieldChip";
import { DropArea } from "./DropArea";
import { FilterEditor } from "./FilterEditor";
import { MemberFilterPopover } from "./MemberFilterPopover";

export interface FieldListPanelProps {
  strings: PivotStrings;
  fields: FieldDef[];
  rows: PivotRow[];
  config: PivotConfig;
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
  /** Dialog mode lays the panel out in two columns like Flexmonster. */
  layout?: "dialog" | "sidebar";
}

const section = "rounded-lg border border-border bg-card p-3";
const heading = "mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const control = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";
const small = "rounded-md border border-border bg-background px-1.5 py-1 text-[11px]";

function SourceField({ field, label, disabled }: { field: string; label: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `src:${field}`,
    disabled,
  });
  return (
    <span
      ref={setNodeRef}
      className={`inline-flex items-center gap-1 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground disabled:cursor-not-allowed"
        aria-label={`Drag ${label}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="truncate text-sm">{label}</span>
    </span>
  );
}

/**
 * The Flexmonster-style field list: searchable source fields on the left,
 * Report filters / Columns / Rows / Measures drop zones on the right.
 * Every drag interaction also has a keyboard/select equivalent.
 */
export function FieldListPanel({
  strings,
  fields,
  rows,
  config,
  readOnly,
  onChange,
  layout = "sidebar",
}: FieldListPanelProps) {
  const [query, setQuery] = useState("");
  const [formula, setFormula] = useState("([revenue] - [cost])");
  const [calcName, setCalcName] = useState("profit");
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const fieldByName = useMemo(
    () => new Map(allFields.map((f) => [f.name, f])),
    [allFields],
  );
  const labelOf = (name: string) => fieldByName.get(name)?.caption ?? name;

  const folders = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const f of allFields) {
      if (query && !(f.caption ?? f.name).toLowerCase().includes(query.toLowerCase())) continue;
      const key = f.folder ?? strings.fields;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return [...map.entries()];
  }, [allFields, query, strings.fields]);

  const setArea = (field: FieldDef, area: PivotArea, index?: number) =>
    onChange(moveField(config, field.name, area, index, field.type));

  const updateValue = (index: number, patch: Partial<ValueDef>) =>
    onChange({ values: config.values.map((v, i) => (i === index ? { ...v, ...patch } : v)) });

  const addCalculated = () => {
    const error = validateFormula(formula);
    setFormulaError(error);
    if (error || !calcName.trim()) return;
    const next: CalculatedField = { name: calcName.trim(), formula, caption: calcName.trim() };
    onChange({ calculated: [...config.calculated.filter((c) => c.name !== next.name), next] });
  };

  const chipId = (area: PivotArea, name: string) => `chip:${area}:${name}`;
  const parse = (id: string) => {
    if (id.startsWith("src:")) return { area: "fields" as PivotArea, name: id.slice(4) };
    if (id.startsWith("chip:")) {
      const [, area, ...rest] = id.split(":");
      return { area: area as PivotArea, name: rest.join(":") };
    }
    if (id.startsWith("area-")) return { area: id.slice(5) as PivotArea, name: "" };
    return null;
  };

  const listOf = (area: PivotArea): string[] =>
    area === "rows"
      ? config.rows
      : area === "cols"
        ? config.cols
        : area === "values"
          ? config.values.map((v) => v.field)
          : area === "filters"
            ? config.filters.map((f) => f.field)
            : [];

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (readOnly || !over) return;
    const from = parse(String(active.id));
    const to = parse(String(over.id));
    if (!from || !to) return;
    const target = to.area;
    const targetList = listOf(target);
    const index = to.name ? targetList.indexOf(to.name) : targetList.length;

    if (from.area === target && from.area !== "fields") {
      const current = targetList.indexOf(from.name);
      if (current === -1 || index === -1 || current === index) return;
      onChange(reorderField(config, target, current, index));
      return;
    }
    const def = fieldByName.get(from.name);
    onChange(moveField(config, from.name, target, index === -1 ? undefined : index, def?.type));
  };

  const chipsFor = (area: PivotArea) => {
    if (area === "values") {
      return config.values.map((v, i) => (
        <FieldChip
          key={`${v.field}-${i}`}
          id={chipId("values", v.field)}
          label={v.caption ?? labelOf(v.field)}
          hint={aggregatorLabels[v.aggregator] ?? v.aggregator}
          disabled={readOnly}
          active
          onRemove={() => onChange({ values: config.values.filter((_, j) => j !== i) })}
        >
          <select
            className={small}
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
            className={small}
            aria-label={`Show ${v.field} as`}
            disabled={readOnly}
            value={v.displayMode ?? "raw"}
            onChange={(e) =>
              updateValue(i, { displayMode: e.target.value as NonNullable<ValueDef["displayMode"]> })
            }
          >
            <option value="raw">Actual value</option>
            <option value="percentOfGrandTotal">% of grand total</option>
            <option value="percentOfRowTotal">% of row</option>
            <option value="percentOfColumnTotal">% of column</option>
            <option value="runningTotal">Running total</option>
            <option value="index">Index</option>
          </select>
        </FieldChip>
      ));
    }
    if (area === "filters") {
      return config.filters.map((f, i) => (
        <div key={`${f.field}-${i}`} className="relative">
          <FieldChip
            id={chipId("filters", f.field)}
            label={labelOf(f.field)}
            hint={f.kind === "values" ? "members" : f.kind}
            disabled={readOnly}
            active
            onFilter={
              f.kind === "values"
                ? () => setMemberFilter(memberFilter === f.field ? null : f.field)
                : undefined
            }
            onRemove={() => onChange({ filters: config.filters.filter((_, j) => j !== i) })}
          />
          {memberFilter === f.field && f.kind === "values" && (
            <MemberFilterPopover
              field={f.field}
              label={labelOf(f.field)}
              rows={rows}
              strings={strings}
              current={f}
              onApply={(members) => {
                onChange({
                  filters: config.filters.map((x, j) =>
                    j === i ? ({ ...f, members } as FilterDef) : x,
                  ),
                });
                setMemberFilter(null);
              }}
              onClose={() => setMemberFilter(null)}
            />
          )}
        </div>
      ));
    }
    return listOf(area).map((name) => (
      <FieldChip
        key={name}
        id={chipId(area, name)}
        label={labelOf(name)}
        disabled={readOnly}
        active
        onRemove={() => onChange(moveField(config, name, "fields"))}
      />
    ));
  };

  const areasBlock = (
    <div className="space-y-2">
      <DropArea
        area="filters"
        title="Report filters"
        hint="Drop a field here to filter the whole report"
        itemIds={config.filters.map((f) => chipId("filters", f.field))}
      >
        {chipsFor("filters")}
      </DropArea>
      <DropArea
        area="cols"
        title={strings.columns}
        hint="Drop fields to build the columns"
        itemIds={config.cols.map((n) => chipId("cols", n))}
      >
        {chipsFor("cols")}
      </DropArea>
      <DropArea
        area="rows"
        title={strings.rows}
        hint="Drop fields to build the rows"
        itemIds={config.rows.map((n) => chipId("rows", n))}
      >
        {chipsFor("rows")}
      </DropArea>
      <DropArea
        area="values"
        title="Measures"
        hint="Drop a number field to summarise it"
        itemIds={config.values.map((v) => chipId("values", v.field))}
      >
        {chipsFor("values")}
      </DropArea>
    </div>
  );

  const fieldsBlock = (
    <div className={section}>
      <h3 className={heading}>{strings.fields}</h3>
      <input
        className={control}
        placeholder={`${strings.search}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={strings.search}
      />
      <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1">
        {folders.map(([folder, list]) => (
          <div key={folder}>
            <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">{folder}</p>
            <ul className="space-y-1">
              {list.map((f) => (
                <li key={f.name} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <SourceField field={f.name} label={f.caption ?? f.name} disabled={readOnly} />
                  </span>
                  <select
                    className={small}
                    aria-label={`Place ${f.caption ?? f.name}`}
                    disabled={readOnly}
                    value={areaOfField(config, f.name)}
                    onChange={(e) => setArea(f, e.target.value as PivotArea)}
                  >
                    <option value="fields">—</option>
                    <option value="filters">{strings.filters}</option>
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
  );

  const extrasBlock = (
    <div className="space-y-2">
      <div className={section}>
        <h3 className={heading}>{strings.filters}</h3>
        <FilterEditor
          strings={strings}
          fields={allFields}
          rows={rows}
          filters={config.filters}
          readOnly={readOnly}
          onAdd={(filter) => onChange({ filters: [...config.filters, filter] })}
          onRemove={(index) => onChange({ filters: config.filters.filter((_, i) => i !== index) })}
        />
      </div>

      <div className={section}>
        <h3 className={heading}>
          <Sigma className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {strings.calculatedValue}
        </h3>
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
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            onClick={addCalculated}
            disabled={readOnly}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
          </button>
        </div>
        {config.calculated.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {config.calculated.map((c) => (
              <li
                key={c.name}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
              >
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
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
            className={small}
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
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {layout === "dialog" ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {fieldsBlock}
          <div className={section}>{areasBlock}</div>
          {extrasBlock}
        </div>
      ) : (
        <div className="space-y-2">
          {fieldsBlock}
          <div className={section}>{areasBlock}</div>
          {extrasBlock}
        </div>
      )}
    </DndContext>
  );
}
