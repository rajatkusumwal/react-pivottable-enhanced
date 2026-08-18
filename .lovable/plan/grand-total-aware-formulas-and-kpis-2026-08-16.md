# Grand-total-aware formulas and KPIs

Two additions to the Calculated values area of Pivot Studio, closing the last two
rows of that section on the comparison page.

## 1. Grand-total-aware formulas

Today a calculated value is a _row-level_ formula: it adds a column to each source
record before aggregation (`[revenue] - [cost]`). That cannot express things like
"share of the grand total" or "revenue per average order", because those need
numbers that only exist after aggregation.

New: a calculated value can be marked **aggregate scope**. Aggregate formulas are
evaluated once per grid cell, after aggregation, and can reference:

- `[field]` — the aggregated measure for that cell (using the field's chosen aggregation)
- `grandTotal([field])` — the report-wide total
- `rowTotal([field])` / `columnTotal([field])` — the totals of the current row / column
- `parentRowTotal([field])` / `parentColumnTotal([field])` — the enclosing member's total

Example formulas: `[revenue] / grandTotal([revenue]) * 100`,
`[revenue] - rowTotal([cost])`, `[profit] / [orders]`.

The Field List formula box gets a scope selector (Row / Aggregate) and a short
hint listing the available total functions. Aggregate calculated values appear in
the field list like any other measure and can be dropped into Values; row-scope
behaviour is unchanged, so existing reports keep working.

Totals for an aggregate measure are computed by evaluating the same formula against
the totals row/column (Flexmonster behaviour), not by summing the cells.

## 2. KPIs from the data source

Field metadata can declare a KPI so the data source itself carries the definition:

```ts
{ name: "revenue", type: "number", kpi: { goal: "target", direction: "higher",
  warningAt: 0.9 } }
```

`goal` names another numeric field (or a constant). A KPI measure renders the value
plus a status indicator — on target / at risk / below target — derived from
value vs. goal and the thresholds, with the arrow reflecting `direction`
(higher-is-better or lower-is-better). Cells expose the status via a data attribute
and an accessible label so screen readers and tests can read it.

KPI fields are grouped under a "KPIs" section in the Field List with a KPI icon, and
adding one adds both the value and its goal comparison in a single click. Sample data
gains a `target` field so the demo shows a working KPI out of the box.

## Technical notes

- `types.ts`: `CalculatedField` gains `scope?: "row" | "aggregate"` (default `"row"`)
  and `aggregator?`. `FieldDef` gains an optional `kpi` descriptor.
- `calculated.ts`: extend the existing safe tokenizer/RPN evaluator with the total
  functions above; they take a single `[field]` argument and resolve from an evaluation
  context. No `eval`/`Function`, same as today.
- `engines/local.ts`: after the existing two-pass cell computation, run a third pass for
  aggregate calculated measures, supplying the cell/row/column/parent/grand totals already
  available in that scope. Totals rows/columns evaluate the formula on their own context.
- `PivotStudio.tsx`: `applyCalculatedFields` keeps handling row-scope fields only;
  aggregate fields flow through `PivotQuery` to the engine.
- `result.ts` / `PivotQuery`: carry `calculated` (aggregate ones) and `kpis` so the REST
  backend receives the same definitions; `mock-api.ts` implements both endpoints' behaviour.
- UI: scope selector and hint in `FieldListPanel.tsx`; KPI grouping + status rendering in
  `FieldListPanel.tsx` and `PivotGrid.tsx`.

## Tests

- Formula parser: total functions parse, unknown function still rejected, unbalanced args error.
- Engine: `% of grand total` via formula matches the built-in display mode; row/column/parent
  total references; aggregate measure totals evaluate the formula rather than summing.
- Mock API: aggregate calculated measure and KPI definitions round-trip through the REST
  contract and produce the same cells as the local engine.
- UI: adding an aggregate formula from the Field List renders a new measure column; a KPI
  measure renders its status label.

## Docs

- `README.md`: new subsections for aggregate formulas (function reference table) and KPI
  metadata, plus the request/response JSON showing both in `PivotQuery`.
- `src/lib/pivot-comparison.ts`: mark "Grand-total-aware formulas" and "KPIs from the data
  source" as supported in the demo column with short notes.
