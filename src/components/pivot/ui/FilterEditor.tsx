import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { dateOperatorLabels, describeFilter, timeOperatorLabels, uniqueMembers } from "../filters";
import type { PivotStrings } from "../locales";
import type { ConditionOperator, FieldDef, FilterDef, PivotRow } from "../types";

export interface FilterEditorProps {
  strings: PivotStrings;
  fields: FieldDef[];
  rows: PivotRow[];
  filters: FilterDef[];
  readOnly: boolean;
  onAdd: (filter: FilterDef) => void;
  onRemove: (index: number) => void;
}

const control = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";
const small = "rounded-md border border-border bg-background px-1.5 py-1 text-xs";

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

/** Report-filter builder: member lists, conditions and top/bottom N. */
export function FilterEditor({
  strings,
  fields,
  rows,
  filters,
  readOnly,
  onAdd,
  onRemove,
}: FilterEditorProps) {
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

  const memberOptions = useMemo(
    () => (field ? uniqueMembers(rows, field).slice(0, MEMBER_OPTION_LIMIT) : []),
    [rows, field],
  );

  const fieldType = fields.find((f) => f.name === field)?.type;
  const isDateField = fieldType === "date";
  const isTimeField = fieldType === "time";
  const scaleLabels = isDateField ? dateOperatorLabels : isTimeField ? timeOperatorLabels : null;
  const shownOperators = scaleLabels
    ? operators
        .filter((o) => scaleLabels[o.value])
        .map((o) => ({ value: o.value, label: scaleLabels[o.value] as string }))
    : operators;
  const inputType = isDateField ? "date" : isTimeField ? "time" : "text";

  const submit = () => {
    if (!field) return;
    if (kind === "values") onAdd({ kind: "values", field, mode: "include", members });
    else if (kind === "condition")
      onAdd({
        kind: "condition",
        field,
        operator: scaleLabels && !scaleLabels[operator] ? "gt" : operator,
        value,
        value2,
        valueType: isDateField ? "date" : isTimeField ? "time" : "auto",
      });
    else if (kind === "subquery")
      onAdd({
        kind: "subquery",
        field,
        measure,
        aggregator: "sum",
        operator: ["gt", "gte", "lt", "lte", "eq", "neq", "between"].includes(operator)
          ? operator
          : "gt",
        value: Number(value) || 0,
        ...(operator === "between" ? { value2: Number(value2) || 0 } : {}),
      });
    else onAdd({ kind: "top", field, measure, aggregator: "sum", direction: "top", count });
  };

  return (
    <div>
      {filters.length > 0 && (
        <ul className="mb-2 space-y-1">
          {filters.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                {describeFilter(f)}
              </span>
              <button
                type="button"
                aria-label={`Remove filter ${i + 1}`}
                disabled={readOnly}
                onClick={() => onRemove(i)}
              >
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
          <option value="subquery">Group condition (subquery)</option>
          <option value="top">Top / bottom N</option>
        </select>
        <select
          className={control}
          aria-label="Filter field"
          value={field}
          disabled={readOnly}
          onChange={(e) => {
            const next = e.target.value;
            setField(next);
            setMembers([]);
            const nextType = fields.find((f) => f.name === next)?.type;
            const nextScaled = nextType === "date" || nextType === "time";
            if (nextScaled || scaleLabels) {
              setValue(nextScaled ? "" : "0");
              setValue2(nextScaled ? "" : "0");
              if (nextScaled && !dateOperatorLabels[operator]) setOperator("gt");
            }
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

        {kind === "subquery" && (
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className={small}
              aria-label="Group measure"
              value={measure}
              disabled={readOnly}
              onChange={(e) => setMeasure(e.target.value)}
            >
              {fields
                .filter((f) => f.type === "number")
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    sum of {f.caption ?? f.name}
                  </option>
                ))}
            </select>
            <select
              className={small}
              aria-label="Group operator"
              value={operator}
              disabled={readOnly}
              onChange={(e) => setOperator(e.target.value as ConditionOperator)}
            >
              {operators
                .filter((o) => dateOperatorLabels[o.value])
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
            <input
              className={small}
              aria-label="Group value"
              value={value}
              disabled={readOnly}
              onChange={(e) => setValue(e.target.value)}
            />
            {operator === "between" && (
              <input
                className={small}
                aria-label="Group second value"
                value={value2}
                disabled={readOnly}
                onChange={(e) => setValue2(e.target.value)}
              />
            )}
            <p className="col-span-2 text-[11px] text-muted-foreground">
              Keeps only the {field} values whose total passes the test — the server runs it as a
              subquery.
            </p>
          </div>
        )}

        {kind === "condition" && (
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className={small}
              aria-label="Operator"
              value={operator}
              disabled={readOnly}
              onChange={(e) => setOperator(e.target.value as ConditionOperator)}
            >
              {shownOperators.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className={small}
              type={inputType}
              aria-label="Filter value"
              value={value}
              disabled={readOnly}
              onChange={(e) => setValue(e.target.value)}
            />
            {operator === "between" && (
              <input
                className={`col-span-2 ${small}`}
                type={inputType}
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
              className={small}
              aria-label="How many"
              value={count}
              disabled={readOnly}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <select
              className={small}
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
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
          onClick={submit}
          disabled={readOnly}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {strings.addFilter}
        </button>
      </div>
    </div>
  );
}
