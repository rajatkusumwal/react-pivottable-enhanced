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
import { GripVertical, Layers, Plus, Sigma, Target } from "lucide-react";
import { aggregatorLabels, aggregatorsForType } from "../aggregators";
import { displayModeLabels } from "../analysis";

import { validateFormula } from "../calculated";
import { areaOfField, moveField, reorderField } from "../dnd";
import type { PivotArea } from "../dnd";
import type { PivotStrings } from "../locales";
import type {
  CalculatedField,
  FieldDef,
  FilterDef,
  PivotConfig,
  PivotRow,
  ValueDef,
} from "../types";
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

/** Field list ordering, mirroring Flexmonster's "sort fields" menu. */
export type SortMode = "source" | "asc" | "desc";

interface FieldGroup {
  folder: string;
  hierarchies: { caption: string; levels: FieldDef[] }[];
  fields: FieldDef[];
}

function SourceField({
  field,
  label,
  disabled,
  dragDisabled,
}: {
  field: string;
  label: string;
  disabled: boolean;
  dragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `src:${field}`,
    disabled: disabled || dragDisabled,
  });
  return (
    <span
      ref={setNodeRef}
      className={`inline-flex items-center gap-1 ${isDragging ? "opacity-50" : ""}`}
    >
      {!dragDisabled && (
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
      )}
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
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("source");
  const [calcScope, setCalcScope] = useState<"row" | "aggregate">("row");
  const dragDisabled = readOnly || config.dragAndDrop === false;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allFields = useMemo<FieldDef[]>(
    () => [
      // KPI fields from the data source get their own group in the list.
      ...fields.map((f) => (f.kpi && !f.folder ? { ...f, folder: "KPIs" } : f)),
      ...config.calculated.map<FieldDef>((c) => ({
        name: c.name,
        caption: c.caption ?? c.name,
        type: "number",
        folder: strings.calculatedValue,
      })),
    ],
    [fields, config.calculated, strings.calculatedValue],
  );

  const fieldByName = useMemo(() => new Map(allFields.map((f) => [f.name, f])), [allFields]);
  const labelOf = (name: string) =>
    config.fieldCaptions?.[name] ?? fieldByName.get(name)?.caption ?? name;

  /**
   * Field list tree: folder → hierarchies (with their levels in order) → loose
   * fields. Search matches the field, its folder and its hierarchy.
   */
  const groups = useMemo<FieldGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const matches = (f: FieldDef) =>
      !q ||
      [f.caption ?? f.name, f.name, f.folder ?? "", f.hierarchy ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);

    const order = new Map(allFields.map((f, i) => [f.name, i]));
    const sortFields = (list: FieldDef[]) => {
      if (sortMode === "source") return list;
      const dir = sortMode === "asc" ? 1 : -1;
      return [...list].sort(
        (a, b) => dir * (a.caption ?? a.name).localeCompare(b.caption ?? b.name),
      );
    };

    const byFolder = new Map<string, FieldDef[]>();
    for (const f of allFields) {
      if (!matches(f)) continue;
      const key = f.folder ?? strings.fields;
      byFolder.set(key, [...(byFolder.get(key) ?? []), f]);
    }

    return [...byFolder.entries()].map(([folder, list]) => {
      const hierarchies = new Map<string, FieldDef[]>();
      const loose: FieldDef[] = [];
      for (const f of list) {
        if (f.hierarchy) hierarchies.set(f.hierarchy, [...(hierarchies.get(f.hierarchy) ?? []), f]);
        else loose.push(f);
      }
      return {
        folder,
        hierarchies: [...hierarchies.entries()].map(([caption, levels]) => ({
          caption,
          levels: [...levels].sort(
            (a, b) => (a.level ?? order.get(a.name) ?? 0) - (b.level ?? order.get(b.name) ?? 0),
          ),
        })),
        fields: sortFields(loose),
      };
    });
  }, [allFields, query, sortMode, strings.fields]);

  const allGroupKeys = useMemo(
    () =>
      groups.flatMap((g) => [g.folder, ...g.hierarchies.map((h) => `${g.folder}>${h.caption}`)]),
    [groups],
  );
  const searching = query.trim().length > 0;
  const isCollapsed = (key: string) => !searching && collapsedGroups.includes(key);
  const toggleGroup = (key: string) =>
    setCollapsedGroups((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );

  const setArea = (field: FieldDef, area: PivotArea, index?: number) =>
    onChange(moveField(config, field.name, area, index, field.type));

  const updateValue = (index: number, patch: Partial<ValueDef>) =>
    onChange({ values: config.values.map((v, i) => (i === index ? { ...v, ...patch } : v)) });

  const addCalculated = () => {
    const error = validateFormula(formula);
    setFormulaError(error);
    if (error || !calcName.trim()) return;
    const next: CalculatedField = {
      name: calcName.trim(),
      formula,
      caption: calcName.trim(),
      scope: calcScope,
      ...(calcScope === "aggregate" ? { aggregator: "sum" as const } : {}),
    };
    onChange({ calculated: [...config.calculated.filter((c) => c.name !== next.name), next] });
  };

  /** Measures may repeat a field, so their chip id also carries the slot index. */
  const chipId = (area: PivotArea, name: string, index?: number) =>
    `chip:${area}:${name}${index === undefined ? "" : `#${index}`}`;
  const parse = (id: string) => {
    if (id.startsWith("src:")) return { area: "fields" as PivotArea, name: id.slice(4), slot: -1 };
    if (id.startsWith("chip:")) {
      const [, area, ...rest] = id.split(":");
      const raw = rest.join(":");
      const hash = raw.lastIndexOf("#");
      return hash === -1
        ? { area: area as PivotArea, name: raw, slot: -1 }
        : { area: area as PivotArea, name: raw.slice(0, hash), slot: Number(raw.slice(hash + 1)) };
    }
    if (id.startsWith("area-")) return { area: id.slice(5) as PivotArea, name: "", slot: -1 };
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
    if (dragDisabled || !over) return;
    const from = parse(String(active.id));
    const to = parse(String(over.id));
    if (!from || !to) return;
    const target = to.area;
    const targetList = listOf(target);
    const index = to.name
      ? to.slot >= 0
        ? to.slot
        : targetList.indexOf(to.name)
      : targetList.length;

    if (from.area === target && from.area !== "fields") {
      const current = from.slot >= 0 ? from.slot : targetList.indexOf(from.name);
      if (current === -1 || index === -1 || current === index) return;
      onChange(reorderField(config, target, current, index));
      return;
    }
    const def = fieldByName.get(from.name);

    onChange(moveField(config, from.name, target, index === -1 ? undefined : index, def?.type));
  };

  const chipsFor = (area: PivotArea) => {
    if (area === "values") {
      return config.values.map((v, i) => {
        const type = v.type ?? fieldByName.get(v.field)?.type ?? "number";
        const slot = config.values.filter((x, j) => x.field === v.field && j < i).length;
        const suffix = slot ? ` (${slot + 1})` : "";
        const def = fieldByName.get(v.field);
        return (
          <FieldChip
            key={`${v.field}-${i}`}
            id={chipId("values", v.field, i)}
            label={v.caption ?? labelOf(v.field)}
            icon={
              config.showAggregationIcon ? (
                <Sigma
                  data-testid="sigma-icon"
                  className="h-3 w-3 shrink-0 text-primary"
                  aria-hidden="true"
                />
              ) : undefined
            }
            hint={aggregatorLabels[v.aggregator] ?? v.aggregator}
            disabled={readOnly}
            dragDisabled={dragDisabled}
            active
            onRemove={() => onChange({ values: config.values.filter((_, j) => j !== i) })}
          >
            <select
              className={small}
              aria-label={`Aggregation for ${v.field}${suffix}`}
              disabled={readOnly}
              value={v.aggregator}
              onChange={(e) => updateValue(i, { aggregator: e.target.value })}
            >
              {aggregatorsForType(type, def?.aggregators).map((name) => (
                <option key={String(name)} value={String(name)}>
                  {aggregatorLabels[String(name)] ?? String(name)}
                </option>
              ))}
            </select>

            <select
              className={small}
              aria-label={`Show ${v.field}${suffix} as`}
              disabled={readOnly || type !== "number"}
              value={v.displayMode ?? "raw"}
              onChange={(e) =>
                updateValue(i, {
                  displayMode: e.target.value as NonNullable<ValueDef["displayMode"]>,
                })
              }
            >
              {Object.entries(displayModeLabels).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>
          </FieldChip>
        );
      });
    }

    if (area === "filters") {
      return config.filters.map((f, i) => (
        <div key={`${f.field}-${i}`} className="relative">
          <FieldChip
            id={chipId("filters", f.field)}
            label={labelOf(f.field)}
            hint={f.kind === "values" ? "members" : f.kind}
            disabled={readOnly}
            dragDisabled={dragDisabled}
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
        dragDisabled={dragDisabled}
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
        hint={
          dragDisabled
            ? "Use the menus in the field list to add fields"
            : "Drop a field here to filter the whole report"
        }
        itemIds={config.filters.map((f) => chipId("filters", f.field))}
      >
        {chipsFor("filters")}
      </DropArea>
      <DropArea
        area="cols"
        title={strings.columns}
        hint={
          dragDisabled
            ? "Use the menus in the field list to add fields"
            : "Drop fields to build the columns"
        }
        itemIds={config.cols.map((n) => chipId("cols", n))}
      >
        {chipsFor("cols")}
      </DropArea>
      <DropArea
        area="rows"
        title={strings.rows}
        hint={
          dragDisabled
            ? "Use the menus in the field list to add fields"
            : "Drop fields to build the rows"
        }
        itemIds={config.rows.map((n) => chipId("rows", n))}
      >
        {chipsFor("rows")}
      </DropArea>
      <DropArea
        area="values"
        title="Measures"
        hint={
          dragDisabled
            ? "Use the menus in the field list to add fields"
            : "Drop a number field to summarise it"
        }
        itemIds={config.values.map((v, i) => chipId("values", v.field, i))}
      >
        {chipsFor("values")}
      </DropArea>
    </div>
  );

  const placeSelect = (f: FieldDef) => (
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
  );

  const fieldRow = (f: FieldDef, indent = false) => (
    <li key={f.name} className={`flex items-center gap-2 ${indent ? "pl-4" : ""}`}>
      {f.kpi ? (
        <Target
          className="h-3.5 w-3.5 shrink-0 text-primary"
          aria-label={`KPI: ${f.caption ?? f.name}`}
        />
      ) : null}
      {indent && f.level ? (
        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">L{f.level}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <SourceField
          field={f.name}
          label={f.caption ?? f.name}
          disabled={readOnly}
          dragDisabled={dragDisabled}
        />
      </span>
      {placeSelect(f)}
    </li>
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
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={small}
          onClick={() => setCollapsedGroups([])}
          aria-label="Expand all field groups"
        >
          Expand all
        </button>
        <button
          type="button"
          className={small}
          onClick={() => setCollapsedGroups(allGroupKeys)}
          aria-label="Collapse all field groups"
        >
          Collapse all
        </button>
        <select
          className={`${small} ml-auto`}
          aria-label="Sort fields"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
        >
          <option value="source">Data order</option>
          <option value="asc">Name A → Z</option>
          <option value="desc">Name Z → A</option>
        </select>
      </div>
      <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1">
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground">No fields match “{query}”</p>
        )}
        {groups.map((group) => (
          <div key={group.folder}>
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"
              aria-label={`Toggle folder ${group.folder}`}
              aria-expanded={!isCollapsed(group.folder)}
              onClick={() => toggleGroup(group.folder)}
            >
              <span aria-hidden="true">{isCollapsed(group.folder) ? "▸" : "▾"}</span>
              {group.folder}
            </button>
            {!isCollapsed(group.folder) && (
              <ul className="space-y-1">
                {group.hierarchies.map((h) => {
                  const key = `${group.folder}>${h.caption}`;
                  return (
                    <li key={key}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm"
                          aria-label={`Toggle hierarchy ${h.caption}`}
                          aria-expanded={!isCollapsed(key)}
                          onClick={() => toggleGroup(key)}
                        >
                          <span aria-hidden="true">{isCollapsed(key) ? "▸" : "▾"}</span>
                          <Layers
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="truncate">{h.caption}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({h.levels.length} levels)
                          </span>
                        </button>
                        <button
                          type="button"
                          className={small}
                          disabled={readOnly}
                          aria-label={`Add all levels of ${h.caption} to rows`}
                          onClick={() =>
                            onChange({
                              rows: [
                                ...config.rows,
                                ...h.levels
                                  .map((l) => l.name)
                                  .filter((n) => !config.rows.includes(n)),
                              ],
                            })
                          }
                        >
                          Add all levels
                        </button>
                      </div>
                      {!isCollapsed(key) && (
                        <ul className="mt-1 space-y-1 border-l border-border pl-1">
                          {h.levels.map((f) => fieldRow(f, true))}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {group.fields.map((f) => fieldRow(f))}
              </ul>
            )}
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
          <select
            className={control}
            aria-label="Formula scope"
            value={calcScope}
            disabled={readOnly}
            onChange={(e) => setCalcScope(e.target.value as "row" | "aggregate")}
          >
            <option value="row">Per record (row scope)</option>
            <option value="aggregate">Per cell, totals aware (aggregate scope)</option>
          </select>
          <input
            className={`${control} font-mono text-xs`}
            aria-label="Formula"
            value={formula}
            disabled={readOnly}
            onChange={(e) => setFormula(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            {calcScope === "row" ? (
              <>
                Use square brackets for fields, e.g. <code>[revenue] - [cost]</code>
              </>
            ) : (
              <>
                Totals are available: <code>grandTotal([revenue])</code>, <code>rowTotal(…)</code>,{" "}
                <code>columnTotal(…)</code>, <code>parentRowTotal(…)</code>,{" "}
                <code>parentColumnTotal(…)</code>
              </>
            )}
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
