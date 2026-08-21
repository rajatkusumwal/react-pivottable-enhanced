# react-pivottable-enhanced

A free, production-grade pivot table for React 19, with its own aggregation engine
and grid renderer — no paid licence and no heavy UI framework. Drag-and-drop field
list, subtotals, expand/collapse, compact / classic / flat layouts, filters,
calculated values, charts, drill-through, exports, localisation and row-level
security — in one component.

- Source code: [github.com/rajatkusumwal/react-pivottable-enhanced](https://github.com/rajatkusumwal/react-pivottable-enhanced)
- Issues: [github.com/rajatkusumwal/react-pivottable-enhanced/issues](https://github.com/rajatkusumwal/react-pivottable-enhanced/issues)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)

Aggregation is **pluggable**: it runs in the browser by default and can be handed to a
backend service (for example Spring Boot + DuckDB) without changing any UI code.

> New here? Start with [`standalone/README.md`](./standalone/README.md) — it is the full
> integration manual (install, Tailwind, props, 14 recipes). This file covers the demo
> site and the backend contract.

---

## 1. Install

```bash
npm i react-pivottable-enhanced
```

Runtime deps that come with it: `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `lucide-react`, `recharts`. `react` / `react-dom` stay peer
dependencies. No router, component library or backend required.

## 2. Use it

```tsx
import { PivotStudio, inferFields, createDefaultConfig } from "react-pivottable-enhanced";

export function Report({ rows }) {
  return (
    <PivotStudio
      data={rows}
      fields={inferFields(rows)}
      initialConfig={createDefaultConfig({
        rows: ["region", "category"],
        cols: ["quarter"],
        values: [{ field: "revenue", aggregator: "sum", format: { decimals: 0, currency: "USD" } }],
      })}
      title="Sales analysis"
      allowFileUpload
    />
  );
}
```

The component source is `standalone/src/pivot/` — the npm package **is** the source of
truth, and this demo site imports it through the `react-pivottable-enhanced` path alias in
`tsconfig.json`. There is no copy of the pivot code anywhere else in the repo.

### Props

| Prop                                                  | Type                                                 | Purpose                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `data`                                                | `PivotRow[]`                                         | Records for the local engine                                                                |
| `fields`                                              | `FieldDef[]`                                         | Captions, types, folders, hierarchy metadata (`inferFields()` helps)                        |
| `engine`                                              | `PivotEngineAdapter`                                 | Aggregation engine; defaults to the local one                                               |
| `initialConfig` / `config` + `onConfigChange`         | `PivotConfig`                                        | Uncontrolled or controlled state                                                            |
| `permissions`                                         | `Permissions`                                        | `readOnly`, `allowExport`, `allowDrillThrough`, `deniedFields`, `maskedFields`, `rowFilter` |
| `fieldsUi`                                            | `"dialog" \| "sidebar"`                              | advanced-style popup (default) or docked panel                                            |
| `allowFileUpload`                                     | `boolean`                                            | Show the CSV/JSON upload bar                                                                |
| `onUploadToBackend`                                   | `(file) => Promise<{ datasetId, rowCount, fields }>` | Send uploads to your service instead of memory                                              |
| `datasetId`                                           | `string`                                             | Dataset handle passed to the backend engine                                                 |
| `showToolbar` / `showSidebar` / `title` / `className` |                                                      | Presentation                                                                                |

### Feature map

- **Grid** — compact / classic / flat layouts, subtotals, grand totals, expand & collapse,
  column resize, cell selection with a sum/avg/min/max bar, keyboard navigation, row & column
  hover highlight, spreadsheet headers, windowed rendering for large results,
  inline cell editing (`config.editing: true` or the "Edit cells" toolbar checkbox —
  double-click a value cell, type a number, press Enter; the change is written back to the
  underlying records, spread proportionally for `sum` measures, and `onDataChange` fires with
  the updated rows).
- **Filters** — member checkbox filters with search, conditional filters
  (number/text/date/time), top/bottom N, group conditions (subqueries), report-filter chips
  above the grid. Picking a field typed `date` in the filter editor switches it to a date
  picker with date wording ("is before", "is on or after", "is between", …) and sets
  `valueType: "date"`; a field typed `time` switches to a time picker with clock wording
  ("is after", "is at or before", …) and sets `valueType: "time"` — comparisons run on
  seconds since midnight, so `2024-02-01T18:45:00Z` and `18:45` compare equal.
  The **group condition** filter type adds `{ kind: "subquery" }`: keep only the members of a
  field whose nested aggregate passes a test (e.g. regions whose `sum(revenue) > 500`),
  which the backend runs as a SQL subquery.
- **Filter surfaces** — `config.showReportFilterArea` (toolbar "Filter area") shows or hides
  the report-filter strip above the grid; `config.showChartFilters` (toolbar "Chart filters")
  shows per-field member filter buttons above the chart that write back into `config.filters`.
- **Field list** — drag-and-drop between Filters / Columns / Rows / Measures (`@dnd-kit`).
  Drag & drop can be switched off with `config.dragAndDrop: false` (or the toolbar
  checkbox); the select menus keep every action available without dragging.
  Fields are grouped by `FieldDef.folder`, and fields sharing a `FieldDef.hierarchy` are
  nested under it and badged with their `FieldDef.level` (L1, L2 …). You can add a single
  sublevel or use **Add all levels** to add the whole drill path to Rows. The panel also has
  a search box (matching field, folder and hierarchy names), **Expand all** / **Collapse all**
  and a sort selector (data order, A → Z, Z → A).
- **Multiple measures** — `config.values` accepts any number of measures and the grid renders
  one leaf column per (column member x measure). The same field can appear several times with
  different aggregations (drop it on Measures again). Measures carry `type`, so string, date
  and time fields work as values too: they offer count, distinct count, min, max, first and
  last, and render as text (ISO dates and `HH:mm` times compare correctly).
- **Aggregations** — sum, count, distinct count, average, median, min, max, product,
  population/sample stdev, percent-of-total; add your own with `registerAggregator()`.
  `aggregatorsForType(type, allowed?)` returns the aggregations valid for a field type and
  drives the measure menus. Restrict them per field with `FieldDef.aggregators`, e.g.
  `{ name: "unitPrice", type: "number", aggregators: ["average", "min", "max"] }` hides Sum.
  The Σ icon on measure chips can be hidden with `config.showAggregationIcon: false`
  (toolbar "Σ icon").
- **Show values as** — every measure takes a `displayMode`: `percentOfGrandTotal`,
  `percentOfRowTotal`, `percentOfColumnTotal`, `percentOfParentRowTotal`,
  `percentOfParentColumnTotal`, `index`, `differenceOfRow` / `differenceOfColumn`,
  `percentDifferenceOfRow` / `percentDifferenceOfColumn`, `runningTotalOfRow` /
  `runningTotalOfColumn`. Pick it from the measure menu in the field list.

- **Calculated values** — safe formula parser (no `eval`), e.g. `[revenue] - [cost]`.
  Choose the scope in the field list: _per record_ (row scope) or _per cell, totals aware_
  (aggregate scope), which unlocks `grandTotal([revenue])`, `rowTotal(…)`, `columnTotal(…)`,
  `parentRowTotal(…)` and `parentColumnTotal(…)` — e.g.
  `[revenue] / grandTotal([revenue]) * 100` for a share-of-total measure.

  ```tsx
  <PivotStudio
    data={sampleData}
    fields={sampleFields}
    initialConfig={{
      rows: ["region"],
      values: [{ field: "share", aggregator: "sum", caption: "Share %" }],
      calculated: [
        { name: "share", scope: "aggregate", formula: "[revenue] / grandTotal([revenue]) * 100" },
      ],
    }}
  />
  ```

- **Renaming fields and measures** — double-click a chip in the field bar (or use the pencil
  icon, or right-click a value cell → _Rename measure…_) to give a field or a single measure
  its own label. Row/column renames live in `config.fieldCaptions` (`{ "region": "Sales area" }`)
  and measure renames in `values[i].caption`, so the same field can appear twice with different
  aggregations and different names. Both travel in the shared report link and are applied to the
  grid, charts, exports and print output. Backends can also ship defaults via `fields[].caption`.

- **KPIs from the data source** — a field can declare its goal and the grid shows a status
  arrow (on target / at risk / below target) next to every value and row total, while the
  field list groups KPI fields together:

  ```ts
  const fields: FieldDef[] = [
    { name: "targetRevenue", caption: "Target revenue", type: "number" },
    {
      name: "revenue",
      caption: "Revenue",
      type: "number",
      kpi: { goal: "targetRevenue", direction: "higher", warningAt: 0.9 },
    },
  ];
  ```

- **Charts** — Recharts columns / stacked columns / columns + line / line / area / pie with
  click-to-drill, a drillable axis and legend, chart-level filtering and a split view:

  ```ts
  config.chart = {
    visible: true,
    type: "stackedBar", // "bar" | "stackedBar" | "columnLine" | "line" | "area" | "pie"
    position: "right", // "bottom" (default) or "right" = split view, grid + chart together
    drillRows: ["West"], // axis drilled into the 2nd row field, filtered to West
    drillCols: [], // legend drill path along config.cols
    hiddenSeries: ["2025"], // series hidden from the legend (chart-only filtering)
    lineSeries: ["Target"], // series drawn as lines in the "columnLine" chart
  };
  ```

  - **Drillable axis / legend** — the axis walks `config.rows` and the legend walks
    `config.cols`. Clicking an axis label pushes that member onto `chart.drillRows` and shows
    the next level; clicking a legend entry does the same for `chart.drillCols`. The
    breadcrumb bar above the chart (`ChartDrillBar`) walks back up.
  - **Interactive filtering** — at the deepest legend level a legend click toggles the series
    in `chart.hiddenSeries` (chart only, report untouched); at the deepest axis level an axis
    click writes a `values` filter for that field into `config.filters`, so the grid, exports
    and the backend query follow. The member filter buttons above the chart
    (`config.showChartFilters`) do the same explicitly.
  - **Split view** — `chart.position: "right"` renders grid and chart side by side (stacked on
    small screens); the toolbar exposes it as "Split view (side by side)".
  - `buildChartData(rows, config)` returns `{ data, series, allSeries, categoryField,
seriesField, canDrillCategory, canDrillSeries, categoryPath, seriesPath }`, so a backend
    can build the same payload: send `chart.drillRows` / `drillCols` as extra equality filters
    and `rows[drillRows.length]` / `cols[drillCols.length]` as the group-by fields.

- **Drill-through** — click any number, or any bar / point / slice in the chart, to inspect the
  source records. Chart drill-through keeps the axis and legend drill path, so a click on the
  second level drills through `[region, country] × [year, quarter]`. The dialog has a built-in
  field list ("Columns", with search) to pick the slice, plus **Select all** / **Deselect all**
  buttons, sortable column headers and a row cap:

  ```ts
  config.drillThrough = {
    fields: ["orderId", "customer", "revenue"], // undefined = every source field, [] = no fields
    maxRows: 1000, // hard cap, toolbar preset
    sort: { field: "revenue", dir: "desc" }, // initial column sort
  };
  ```

  The same options travel over the REST contract — `POST /drillthrough` accepts
  `{ rowKey, colKey, query, fields?, sort?, limit? }` and answers
  `{ rows, total }` (`total` = matches before the cap, used for the "N of M" note).
  `fields` is optional: omit it or send `undefined` for every source field; send `[]` to return
  empty record objects (matching the Deselect-all state).
  `applyDrillSlice(rows, { fields, sort, maxRows })` is exported so a backend adapter can
  reproduce the projection, sorting and cap exactly; `chartDrillKeys(chartData, category,
series)` turns a chart click into `{ rowKey, colKey, label }`.

  The dialog has its own
  **Export…**, **Print** and **Copy** controls (respecting `permissions.allowExport`), so the
  records behind a cell can leave the app as CSV/TSV/Excel/HTML/JSON:

  ```ts
  import { matrixFromRows, exportMatrix } from "react-pivottable-enhanced";

  exportMatrix(matrixFromRows(rows, "Records behind North", { header: "Acme Ltd" }), "csv");
  ```

- **Export & print** — Excel (.xls), CSV, TSV, HTML, JSON, clipboard, print/PDF.
  **Custom headers and footers**: set `config.exportHeader` / `config.exportFooter` (or type
  them in Format → _Export header & footer_) and every export and the print view prints them
  above and below the table. Programmatically, pass a decoration object:

  ```ts
  import { matrixFromResult, printMatrix } from "react-pivottable-enhanced";

  printMatrix(
    matrixFromResult(result, "en", "Q4 revenue", {
      header: "Acme Ltd\nQ4 board pack",
      footer: "Confidential — do not distribute",
    }),
  );
  ```

- **Formatting UI** — the toolbar **Format** button (also on the cell right-click menu) opens a
  dialog with three tabs: _Number formatting_ (decimals, thousands separator, ISO currency
  code, prefix, suffix — written to `ValueDef.format`), _Conditional formatting_ (rules of
  `{ field, operator, value, color, background }` written to `config.conditionalFormats`) and
  _Export header & footer_.
- **Share a report by link** — the toolbar **Share link** button serialises the whole report
  (fields, filters, formatting, layout, locale) into a `?report=` query parameter, copies the
  URL to the clipboard and updates the address bar. On mount, an uncontrolled `PivotStudio`
  restores a report found in the URL, so links work with no backend storage:

  ```ts
  import {
    buildReportUrl,
    readReportFromUrl,
    encodeReport,
    decodeReport,
  } from "react-pivottable-enhanced";

  const url = buildReportUrl(window.location.href, config); // share this
  const restored = readReportFromUrl(url); // PivotConfig | null
  ```

  For very large reports, store `encodeReport(config)` server-side and share a short id instead.

- **Fullscreen mode** — the toolbar **Full screen** button uses the browser Fullscreen API when
  available and always applies a fixed overlay; `Esc` leaves it.
- **Context menu** — right-click any value cell for drill-through, copy this value, copy the
  whole table, export to CSV, number/conditional formatting and drill up/down all levels.
  Reuse it standalone with the exported `GridContextMenu` plus `PivotGrid`'s
  `onCellContextMenu({ x, y, rowKey, colKey, label, value })` callback.
- **Localisation** — bundled `en`, `fr`, `de`, `es`; locale-aware number formats.
- **Security** — `rowFilter` row-level security, field masking, denied fields, read-only mode.

---

## 3. Moving aggregation to a backend (Spring Boot + DuckDB)

Everything the grid renders is a `PivotResult`. Swap the engine and the UI is unchanged:

```tsx
import { PivotStudio, createBackendEngine, createHybridEngine } from "react-pivottable-enhanced";

const engine = createBackendEngine({
  baseUrl: "https://analytics.example.com",
  headers: () => ({ Authorization: `Bearer ${token}` }),
});

// Or: local for small datasets, backend above the threshold.
const hybrid = createHybridEngine({ baseUrl: "...", threshold: 50_000 });

<PivotStudio
  data={rows}
  fields={fields}
  engine={engine}
  datasetId={datasetId}
  allowFileUpload
  onUploadToBackend={uploadCsv}
/>;
```

### REST contract

All endpoints are JSON over POST.

#### `POST /api/pivot/query`

```jsonc
{
  "rows": ["region", "category"],
  "cols": ["quarter"],
  "values": [
    { "field": "revenue", "aggregator": "sum", "caption": "Revenue", "type": "number" },
    { "field": "revenue", "aggregator": "average", "caption": "Avg revenue", "type": "number" },
    { "field": "revenue", "aggregator": "sum", "displayMode": "percentOfParentRowTotal" },
    { "field": "customerName", "aggregator": "distinctCount", "type": "string" },
    { "field": "orderDate", "aggregator": "min", "type": "date" },
    { "field": "orderTime", "aggregator": "max", "type": "time" },
  ],

  "filters": [
    { "kind": "values", "field": "region", "mode": "include", "members": ["North"] },
    { "kind": "condition", "field": "revenue", "operator": "gt", "value": 1000 },
    {
      "kind": "condition",
      "field": "orderDate",
      "operator": "between",
      "value": "2024-02-01",
      "value2": "2024-02-28",
      "valueType": "date",
    },
    {
      "kind": "condition",
      "field": "orderTime",
      "operator": "between",
      "value": "09:00",
      "value2": "17:00",
      "valueType": "time",
    },
    {
      "kind": "subquery",
      "field": "region",
      "measure": "revenue",
      "aggregator": "sum",
      "operator": "gt",
      "value": 500,
    },
  ],
  "showSubTotals": true,
  "showGrandTotals": true,
  "grandTotalsPosition": "bottom",
  "layout": "compact",
  "collapsed": ["North"],
  "collapsedCols": ["Bikes"],
  "sort": { "by": 0, "direction": "desc" },
  "sorts": [
    { "by": 0, "direction": "desc" },
    { "by": "rows", "direction": "asc" },
  ],
  "locale": "en",
  // Aggregate-scope formulas become measures by name (see "values" above);
  // row-scope entries are applied to the records before grouping.
  "calculated": [
    {
      "name": "share",
      "caption": "Share of total",
      "scope": "aggregate",
      "aggregator": "sum",
      "formula": "[revenue] / grandTotal([revenue]) * 100",
    },
    { "name": "profit", "scope": "row", "formula": "[revenue] - [cost]" },
  ],
  // KPI metadata copied from the field list, keyed by field name.
  "kpis": {
    "revenue": { "goal": "targetRevenue", "direction": "higher", "warningAt": 0.9 },
  },
  "limit": 500,
  "offset": 0,
  "datasetId": "sales-2026",
}
```

Response (`PivotResult`):

```jsonc
{
  "rowFields": ["region", "category"],
  "colFields": ["quarter"],
  "measure": { "field": "revenue", "caption": "Revenue", "aggregator": "sum" },
  "measures": [
    { "field": "revenue", "caption": "Revenue", "aggregator": "sum", "type": "number" },
    { "field": "revenue", "caption": "Avg revenue", "aggregator": "average", "type": "number" },
  ],
  // One leaf column per (column member x measure); this maps leaf -> measure index.
  "measureIndexByLeaf": [0, 1],
  "rowTotalsByMeasure": [[576158, 1200]],
  "grandTotals": [2583335, 1345],
  "rowHeaders": [
    {
      "key": ["North"],
      "label": "North",
      "depth": 0,
      "kind": "member",
      "expandable": true,
      "expanded": true,
      "span": 1,
    },
    {
      "key": ["North", "Bikes"],
      "label": "Bikes",
      "depth": 1,
      "kind": "member",
      "expandable": false,
      "expanded": true,
      "span": 1,
    },
    {
      "key": ["North"],
      "label": "North total",
      "depth": 0,
      "kind": "subtotal",
      "expandable": false,
      "expanded": true,
      "span": 1,
    },
  ],
  "colHeaderRows": [
    [
      {
        "key": ["Q1"],
        "label": "Q1",
        "depth": 0,
        "kind": "member",
        "expandable": false,
        "expanded": true,
        "span": 1,
      },
    ],
  ],
  "colLeaves": [
    {
      "key": ["Q1"],
      "label": "Q1",
      "depth": 0,
      "kind": "member",
      "expandable": false,
      "expanded": true,
      "span": 1,
    },
  ],
  "cells": [[147312], [43290], [147312]],
  "rowTotals": [576158, 222656, 576158],
  "colTotals": [608186],
  "grandTotal": 2583335,
  // Aligned with "cells" / "rowTotalsByMeasure"; null when the measure is not a KPI.
  "kpiStatuses": [[{ "state": "onTarget", "ratio": 1.12, "goal": 131500 }], [null], [null]],
  "kpiRowTotals": [[{ "state": "atRisk", "ratio": 0.94, "goal": 612000 }], [null], [null]],
  "sourceCount": 480,
  "meta": { "source": "backend", "queryId": "b12f" },
}
```

Rules the server must respect:

- `cells[i][j]` aligns with `rowHeaders[i]` and `colLeaves[j]`; use `null` for empty cells.
- Emit subtotal rows only when `showSubTotals` is true, and skip children of any path in
  `collapsed`.
- Multilevel drill: `collapsed` holds row member paths, `collapsedCols` holds column member
  paths (levels joined with `\u0000`). A collapsed column member becomes a single aggregated
  leaf: keep it in `colHeaderRows` with `expandable: true`, `expanded: false` and
  `rowSpan` covering the remaining column levels, and drop its descendants from `colLeaves`.
  Parent members that still have visible children carry `expandable: true, expanded: true`.
- `layout: "flat"` means one row per source record combination, no subtotals. `sorts` is the
  multi-column sort chain used by the flat layout (shift-click in the UI) and takes precedence
  over `sort`; `by: "rows"` sorts row members, a number sorts by that leaf column.
- `grandTotalsPosition` decides whether the `kind: "grand"` row is emitted first or last.
- `limit` / `offset` page the source records before aggregation.
- Each measure may carry a `displayMode` ("show values as"), applied **after** aggregation and
  per measure. Return `null` when the reference total is missing or zero:

  | `displayMode`                                                          | Cell value                                                                                                    |
  | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
  | `raw` (default)                                                        | the aggregate                                                                                                 |
  | `percentOfGrandTotal`                                                  | value / grand total × 100                                                                                     |
  | `percentOfRowTotal` / `percentOfColumnTotal`                           | value / row (column) total × 100                                                                              |
  | `percentOfParentRowTotal`                                              | value / the same column's value for the row's **parent member**; falls back to the row total at the top level |
  | `percentOfParentColumnTotal`                                           | value / the parent column group's value for that row; falls back to the column total                          |
  | `index`                                                                | (value × grand total) / (row total × column total)                                                            |
  | `differenceOfRow` / `differenceOfColumn`                               | value − previous column (previous row); `null` in the first column (row)                                      |
  | `percentDifferenceOfRow` / `percentDifferenceOfColumn`                 | that difference ÷ the previous value × 100                                                                    |
  | `runningTotalOfRow`                                                    | cumulative sum across the row, left to right                                                                  |
  | `runningTotalOfColumn` (`runningTotal` is an alias of the row variant) | cumulative sum down the column, top to bottom                                                                 |

- `calculated` holds the report's formulas. `scope: "row"` (the default) is evaluated per
  record before grouping and simply adds a column. `scope: "aggregate"` is evaluated **per
  grid cell after aggregation** and is referenced as a measure by `name`, so
  `{ "field": "share", "aggregator": "sum" }` renders the formula rather than a column.
  Inside an aggregate formula, `[field]` is that field aggregated over the cell using the
  formula's own `aggregator` (default `sum`), and the total functions resolve against the
  same cell:

  | Function                 | SQL equivalent for the cell                                                                  |
  | ------------------------ | -------------------------------------------------------------------------------------------- |
  | `grandTotal([f])`        | aggregate of `f` over the whole (filtered) dataset                                           |
  | `rowTotal([f])`          | over the cell's row group, all columns                                                       |
  | `columnTotal([f])`       | over the cell's column group, all rows                                                       |
  | `parentRowTotal([f])`    | over the row member's parent group, same column; falls back to `grandTotal` at the top level |
  | `parentColumnTotal([f])` | over the column member's parent group, same row                                              |

  Operators are `+ - * / % ^`, plus `abs`, `round`, `min`, `max` and `sqrt`. Division by zero
  yields `0`; a formula that cannot be evaluated yields `null`. Never `eval` these strings —
  parse them (the client uses a shunting-yard parser).

- `kpis` maps a field name to its KPI descriptor, taken from `field.kpi` in the field list:
  `{ goal: string | number, direction?: "higher" | "lower", warningAt?: number }`. For every
  KPI measure the server grades the cell against the goal aggregated the same way and returns
  `kpiStatuses` / `kpiRowTotals`: `state` is `onTarget` when `ratio >= 1`, `atRisk` when
  `ratio >= warningAt` (default `0.9`) and `below` otherwise, where
  `ratio = value / goal` (`goal / value` when `direction` is `"lower"`). Return `null` for
  non-KPI measures and when the goal is missing or zero.
- Condition filters carry an optional `valueType`
  (`"auto" | "number" | "text" | "date" | "time"`).
  With `"date"` the server must compare on the date timeline at **day granularity** —
  parse ISO dates (`2024-02-01`) and timestamps (`2024-02-01T18:45:00Z`), truncate both
  sides to UTC midnight, and treat unparseable values as non-matching. In SQL/DuckDB that is
  `CAST(field AS DATE) >= DATE '2024-02-01'` (and `BETWEEN … AND …` for `between`).
  Date operators map to: `lt` is before, `lte` is on or before, `gt` is after,
  `gte` is on or after, `eq` is on, `neq` is not on, `between` is between (inclusive).
- With `valueType: "time"` the server compares **clock time only** — take the time part of the
  value (`HH:mm[:ss]`, or the time of an ISO timestamp) as seconds since midnight and compare
  against the operand parsed the same way; unparseable values never match. In DuckDB:
  `CAST(field AS TIME) >= TIME '09:00:00'` (and `BETWEEN TIME '09:00:00' AND TIME '17:00:00'`).
- `{ "kind": "subquery", "field", "measure", "aggregator", "operator", "value", "value2?" }`
  is server-side filtering by a nested aggregate. Keep only the rows whose `field` value is in
  the set of members passing the test:

  ```sql
  WHERE region IN (
    SELECT region FROM sales GROUP BY region HAVING SUM(revenue) > 500
  )
  ```

  The subquery runs over the records left by the other filters, and the operator set is the
  same numeric set (`gt`, `gte`, `lt`, `lte`, `eq`, `neq`, `between`).
  With `"auto"` (or omitted), values are treated as dates only when both sides are
  ISO-like text; plain numbers stay numeric.

#### `POST /api/pivot/drillthrough`

```jsonc
{ "rowKey": ["North", "Bikes"], "colKey": ["Q1"], "limit": 500, "query": {/* as above */} }
```

Returns `{ "rows": [ { "region": "North", ... } ] }` — the raw records behind the cell.

#### `POST /api/pivot/datasets` (multipart upload)

`file` part; returns `{ "datasetId": "…", "rowCount": 12345, "fields": [{ "name": "region", "caption": "Region", "type": "string" }] }`.

#### `GET /api/pivot/datasets/{id}/fields`

Returns the same `fields` array so the field list can be built without downloading data.

#### `POST /api/pivot/members`

`{ "field": "country", "search": "ca", "limit": 200, "datasetId": "…" }` →
`{ "members": ["Canada"], "total": 1 }` — powers the member filter popover on large datasets.

#### `POST /api/pivot/edit` (inline cell editing)

```jsonc
{
  "rowFields": ["region", "country"],
  "colFields": ["category"],
  "rowKey": ["North", "USA"],
  "colKey": ["Bikes"],
  "field": "revenue",
  "aggregator": "sum",
  "value": 500,
  "datasetId": "sales-2026",
}
```

Returns `{ "changed": true, "rowCount": 12345 }`. The server applies the same write-back rule
as the browser: for `sum` the new value is spread across contributing records in proportion to
their current share; for `average` / `min` / `max` / `median` / `first` / `last` / `product`
every contributing record is set to the value; `count` / `distinctCount` are rejected with 422.
Call it from `createBackendClient(...).applyEdit(request)`.

#### `POST /api/pivot/datasets` (remote dataset registration)

For files that are far too big to upload from the browser (1GB+ parquet/CSV in object
storage, or a warehouse table), register them by reference instead:

```jsonc
{
  "uri": "s3://warehouse/sales-2024.parquet",
  "format": "parquet",
  "csv": { "delimiter": ";", "decimalSeparator": ",", "thousandsSeparator": "." },
}
```

Returns `{ "datasetId": "sales-2024", "rowCount": 812345678, "fields": [...] }`. The same
endpoint still accepts a multipart upload for small files.

```ts
import { registerRemoteDataset } from "react-pivottable-enhanced";

const { datasetId } = await registerRemoteDataset({
  baseUrl: "/api/pivot",
  uri: "s3://warehouse/sales-2024.parquet",
  format: "parquet",
});
```

### Custom data source API (any backend)

`createCustomEngine` adapts _any_ transport — GraphQL, gRPC-web, an internal SDK, a Web
Worker — to the engine contract. Implement whichever level your backend supports:

```ts
import { createCustomEngine, PivotStudio } from "react-pivottable-enhanced";

const engine = createCustomEngine({
  id: "graphql",
  // 1. Full server-side aggregation: return a ready PivotResult.
  query: async (request) => gql.pivot(request),
  // 2. or partial: return pre-grouped records, the browser lays them out.
  // aggregate: async (request) => sdk.groupBy(request),
  // 3. or raw records only: the browser aggregates.
  // fetchRows: async (request) => sdk.rows(request),
  drillThrough: async (request) => gql.records(request),   // optional
  getFields:   async () => gql.schema(),                   // optional
  getMembers:  async (field, search) => gql.members(field, search), // optional
});

<PivotStudio data={[]} fields={fields} engine={engine} />;
```

Results are tagged `meta.source: "backend"` and `meta.queryId: <id>`.

### Server-side aggregation of large datasets (1GB+)

```ts
import {
  createServerAggregationEngine,
  shouldOffload,
  streamCsvRows,
} from "react-pivottable-enhanced";

// Every query is answered by the service; records never reach the browser.
const engine = createServerAggregationEngine({
  baseUrl: "/api/pivot",
  datasetId: "sales-2024",
  pageSize: 5000, // grid rows requested per query (limit/offset)
});

// Decide browser vs backend from a file or row estimate.
shouldOffload({ rowCount: 2_000_000 }); // { offload: true, reason: "rows" }
shouldOffload({ byteSize: 1024 ** 3 }); // { offload: true, reason: "bytes" }

// Read a multi-GB CSV in batches (nothing bigger than one batch in memory).
await streamCsvRows(
  file,
  async (rows, summary) => {
    await fetch("/api/pivot/datasets/sales-2024/rows", {
      method: "POST",
      body: JSON.stringify(rows),
    });
    console.log(summary.rowCount);
  },
  { batchSize: 10_000, csv: { delimiter: ";", decimalSeparator: "," } },
);
```

`streamCsvRows` accepts a `File`/`Blob`, a `ReadableStream`, or an async iterable of text
chunks, and supports `maxRows` for sampling. Thresholds: `OFFLOAD_ROW_THRESHOLD` (100 000
rows) and `OFFLOAD_BYTE_THRESHOLD` (50 MB) — both overridable per call.

### CSV separator / decimal / thousands options

The CSV dialect lives in `config.csv` and is used both when reading a file and when writing a
CSV export, so a round trip keeps the same format. The data source bar exposes three
dropdowns (separator, decimal mark, thousands mark) and uploads auto-detect the dialect.

```ts
<PivotStudio
  data={data}
  fields={fields}
  initialConfig={{ csv: { delimiter: ";", decimalSeparator: ",", thousandsSeparator: "." } }}
/>
```

Helpers: `parseCsv(text, csvOptions)`, `toCsv(matrix, csvOptions)`, `parseCsvNumber`,
`formatCsvNumber`, `detectCsvOptions(text)`.

### Spring Boot + DuckDB sketch

```java
@RestController
@RequestMapping("/api/pivot")
public class PivotController {
  private final DataSource duckdb; // jdbc:duckdb:/data/analytics.db

  @PostMapping("/query")
  public PivotResult query(@RequestBody @Valid PivotQuery q) {
    return pivotService.run(q); // build SQL, map to PivotResult
  }
}
```

DuckDB does the grouping in one pass with `GROUPING SETS`, which gives you leaf rows and
subtotals together:

```sql
SELECT region, category, quarter,
       SUM(revenue) AS value,
       GROUPING(category) AS is_subtotal
FROM   read_parquet('sales/*.parquet')
WHERE  region IN ('North', 'South')
GROUP BY GROUPING SETS ((region, category, quarter), (region, quarter), (quarter), ())
ORDER BY region, is_subtotal, category;
```

Then walk the result set once: rows with `is_subtotal = 0` become `kind: "member"`,
`is_subtotal = 1` becomes `kind: "subtotal"`, the `()` set becomes `grandTotal`.

Practical notes:

- Whitelist field names against the dataset schema before interpolating them into SQL, and
  bind every filter literal as a parameter.
- Apply row-level security server-side too — the client `rowFilter` is a UX convenience, not
  a security boundary.
- Uploaded files land well in DuckDB via `read_csv_auto('…')` / `read_json_auto('…')`, saved
  as a Parquet file keyed by `datasetId`.
- Cache on `(datasetId, query hash)` and return the hash as `meta.queryId`.

---

## 4. Testing

```bash
npx vitest run
```

The suite covers grid rendering and totals, sorting, drill-through, filters, calculated
values, charts, export, localisation, permissions, controlled config, the drag-and-drop
field list, member filters, file upload, and a custom engine adapter (proving the backend
swap works without UI changes).

`standalone/src/pivot/ui/PivotGrid.test.tsx` covers the advanced-style grid itself:
compact / classic / flat layouts, subtotals and grand totals, expand and collapse,
spreadsheet headers, repeated member labels, cell selection with the auto-calculation
stats, keyboard navigation, clipboard copy, multi-column sorting, column drill and row
windowing; `editing.test.tsx` covers the inline cell editing write-back. Date and time
conditional filters, group-condition (subquery) filters, the report-filter-area toggle and the
chart filter controls are covered in `pivot-core.test.ts`, `PivotStudio.test.tsx` and
`engines/mock-api.test.ts` (the last one over the REST contract).

`drillthrough.test.tsx` covers drill-through end to end: the slice helpers (projection,
sorting, row cap, the `fields: undefined` vs `[]` semantics), the local engine and the REST
contract (including the uncapped `total`), chart drill keys and clicking through from the chart,
plus the dialog's column sorting, built-in field list and Select all / Deselect all buttons.

`charts.test.tsx` covers the chart layer: stacked columns, the combined column + line chart,
axis and legend drill (including the drill breadcrumbs), legend series hiding, axis-click
report filtering and the grid + chart split view.

`report-link.test.ts` covers report sharing (encode/decode round-trip, URL building, corrupt
tokens) and `reporting-ui.test.tsx` covers the reporting UX end to end: export headers and
footers in CSV/TSV/HTML, the drill-through export controls (including the read-only case),
copying and restoring a share link, the number and conditional formatting dialogs, fullscreen
and the grid context menu.

`csv-options.test.ts` covers the CSV dialect: European number parsing and writing, semicolon
files, dialect detection, exports with a chosen separator/decimal/thousands mark and a full
export → parse round trip. `large-data.test.ts` covers the custom data source API (query /
aggregate / fetchRows levels, drill-through fallback), server-side aggregation with paging,
remote dataset registration, the offload thresholds and the streaming CSV reader (batching,
dialects, `maxRows` sampling, Blob input) — all against the in-memory mock API. 273 tests in
total.

### Backend integration tests (no server required)

`standalone/src/pivot/engines/backend.test.ts` verifies the REST contract against a mocked
`fetchImpl` — pass your own `fetch` mock through `createBackendClient({ fetchImpl })` or
`createBackendEngine({ fetchImpl })` and you can test the whole Spring Boot + DuckDB
integration without running the service:

```ts
const fetchImpl = vi.fn(async () => new Response(JSON.stringify(cannedPivotResult)));
const engine = createBackendEngine({ baseUrl: "https://api.test", datasetId: "ds", fetchImpl });
const result = await engine.query(pivotQuery, []);
```

#### Ready-made mock API

`createMockPivotApi` implements every endpoint above in memory on top of the local engine, so
the full grid can be driven over the REST contract with no server at all — useful in tests and
for a backend-shaped demo:

```ts
import { createMockPivotApi, createBackendEngine, sampleData, sampleFields } from "react-pivottable-enhanced";

const api = createMockPivotApi({ rows: sampleData, fields: sampleFields, datasetId: "sales" });
const engine = createBackendEngine({ baseUrl: "https://api.test", datasetId: "sales", fetchImpl: api.fetch });

<PivotStudio data={[]} fields={sampleFields} engine={engine} datasetId="sales" />;
// api.requests -> every request body sent; api.datasets -> server-side rows after edits
```

`standalone/src/pivot/engines/mock-api.test.ts` runs every grid feature through it: compact /
classic / flat layouts, subtotals and grand totals (including position), row and column drill
(`collapsed` / `collapsedCols`), single and multi-column sorting, server-side filters, paging,
aggregator switching, drill-through, field metadata, member search, dataset upload and inline
cell edits. If your Spring Boot service passes the same assertions, the UI works unchanged.

The mocked tests assert request URLs and methods, JSON bodies (including `datasetId`
injection), auth headers, custom endpoint paths, multipart uploads, `PivotBackendError`
status/message propagation, and hybrid routing (browser-side under the row threshold,
backend above it or whenever a `datasetId` is set). Use them as executable documentation
when implementing the server side.

## 5. Contributing / customising

Everything tunable is in one file, `standalone/src/pivot/constants.ts` — row
height, virtualisation thresholds, member list limits, the default
drill-through row cap and the type-inference sample size. Change a value there
instead of hunting through components.

Useful commands:

```bash
bun run dev      # start the demo app
bun run test     # run the whole suite once (vitest) — 364 tests
bun run test:coverage # same, with coverage thresholds enforced
bun run test:package  # slow: build the npm package and test the artifact
bun run lint     # eslint + prettier rules
bun run format   # rewrite files with prettier
```

The suite covers core pivoting, edge cases, the grid UI, charts, drill-through,
exports, the REST backend contract _and its failure paths_, accessibility and
keyboard navigation, 100k-row performance budgets and reload persistence. See
"What the suite covers" in [standalone/README.md](./standalone/README.md) for the
file-by-file map.

### Testing the npm package

`bun run test` includes `standalone/tests/package.test.ts`, which checks that the
package entry point exports every documented name and that those exports work.

`bun run test:package` is the slow suite: it runs the real library build
(`vite build -> tsc -> build-css`) and then asserts on `standalone/dist/`
— that `index.js`, `index.d.ts` and `pivot-theme.css` exist, that React and the
runtime deps stay external, and that a consumer can import the built bundle and
render `PivotStudio`. Run it before every `npm publish`.

### Running a stable local demo (no HMR reloads)

This is a server-rendered app, so `vite preview` cannot serve the build (it
looks for a static `dist/server/server` entry and fails).

Note the two different build targets:

| Command               | Target             | Output folder | Runs with                    |
| --------------------- | ------------------ | ------------- | ---------------------------- |
| `npm run build`       | Cloudflare Workers | `.output/`    | wrangler (not `node`)        |
| `npm run build:local` | plain Node server  | `dist/`       | `node dist/server/index.mjs` |

So for a local demo use the Node build, not the default one:

```bash
npm run build:local     # == NITRO_PRESET=node-server vite build
npm run preview:local   # == node dist/server/index.mjs
# -> http://localhost:3000  (override with PORT=8080)
```

If you ran `npm run build` and only got a `.output/` folder, that is the
Cloudflare bundle — `node .output/server/index.mjs` will not start a server.
Delete it and run `npm run build:local` instead.

The resulting `dist/` folder is self-contained. To run it outside the project
folder, copy `dist/` and start the server:

```bash
cp -r dist /path/to/deploy
cd /path/to/deploy
PORT=8080 node dist/server/index.mjs
# -> http://localhost:8080
```

No `node_modules`, source files or project root are needed in the deployment
folder — only Node.js 18+. The server is bundled with its runtime dependencies.

### Deploying to Cloud Foundry (`cf push`)

The repo ships a `manifest.yml` that pushes the `dist/` folder with the Node.js
buildpack. Build the Node bundle first — the default Cloudflare build (`.output/`)
will not run on CF:

```bash
npm run build:local        # emits dist/ (Node server bundle)
cf login -a <your-api-endpoint>
cf push                    # uses manifest.yml
```

What the manifest does:

- `path: dist` — only the built bundle is uploaded, no sources or `node_modules`
- `command: node server/index.mjs` — Nitro's Node entry
- the app listens on `$PORT`, which Cloud Foundry injects; no code change needed
- `nodejs_buildpack` supplies the Node runtime (the bundle has no npm deps to install)

Useful variations:

```bash
cf push my-app-name                  # override the app name
cf push -f manifest.yml --var ...    # if you templatise the manifest
cf logs react-pivottable-enhanced --recent
```

If the app crashes on start, check `cf logs` for `Cannot find module` — that
means the Cloudflare build was pushed by mistake; re-run `npm run build:local`.

Conventions (also documented for AI coding agents in `AGENTS.md`, `CLAUDE.md`
and `GEMINI.md`): tests live next to the code, cover a normal case, an edge case
and a worst case; pure logic stays out of components; every engine returns the
same `PivotResult` so the browser engine and a REST backend stay swappable.

## Using the pivot table in another React app

### As an npm package

```bash
npm i react-pivottable-enhanced
```

```tsx
import { PivotStudio, sampleData, sampleFields } from "react-pivottable-enhanced";
import "react-pivottable-enhanced/styles.css";

<PivotStudio data={sampleData} fields={sampleFields} />;
```

`styles.css` is compiled and self-contained (Tailwind preflight, the utilities
the grid uses, theme tokens and the grid CSS), so host apps need no Tailwind,
PostCSS or content configuration:

```css
@import "react-pivottable-enhanced/styles.css";
```

The only runtime deps are `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `lucide-react` and `recharts`; `react`/`react-dom` are
peer dependencies. No router, component library or backend required. The
in-app docs page lives at `/docs`.

### Building and publishing that package

`standalone/src/pivot/` is self-contained: it imports nothing from the demo app
(no router, no shadcn/ui, no `@/lib` helpers). The `standalone/` folder packages
exactly that.

```bash
cd standalone
npm install
npm run build     # types + ESM bundle + compiled styles.css -> dist/
npm publish       # prepublishOnly re-runs the build
```

From the repo root you can also run `bun run lib:build` and
`bun run lib:typecheck` without changing directory.

### Or just copy the folder

Drop `standalone/src/pivot/` into your app, import
`standalone/src/pivot-theme.css` next to your global CSS, and
`import { PivotStudio } from "./pivot"`. Every import inside the folder is
relative, so it works wherever you put it.

Full instructions, including theming, Next.js SSR notes and the
backend-engine wiring, are in [`standalone/README.md`](./standalone/README.md).

## Framework integrations

| Framework | Package                             | Status                                     |
| --------- | ----------------------------------- | ------------------------------------------ |
| React     | `react-pivottable-enhanced`         | Native — this is where the code lives      |
| Angular   | `react-pivottable-enhanced-angular` | Supported through a thin wrapper component |

### Angular

`angular/` holds a small `<pivot-studio>` Angular component that mounts the React
pivot table, maps every input onto a React prop and re-emits the callbacks as Angular
outputs. No pivot logic is duplicated, so Angular apps get the same features and the
same tests.

```bash
npm i react-pivottable-enhanced-angular react-pivottable-enhanced react react-dom
```

```ts
import { Component } from "@angular/core";
import { PivotStudioComponent, sampleData, sampleFields } from "react-pivottable-enhanced-angular";

@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  template: `<pivot-studio
    [data]="data"
    [fields]="fields"
    title="Sales report"
    (configChange)="onLayout($event)"
  ></pivot-studio>`,
})
export class ReportsComponent {
  data = sampleData;
  fields = sampleFields;
  onLayout(config: unknown) {}
}
```

Add the theme once in `angular.json` (`node_modules/react-pivottable-enhanced/dist/pivot-theme.css`).
The trade-off is that React + ReactDOM (~50-150 KB gzipped) ship inside the Angular
app; a framework-agnostic core remains an option if that ever matters.

Build and typecheck it from the repo root:

```bash
bun run angular:build       # builds the React library first, then emits angular/dist
bun run angular:typecheck
```

Full input/output reference: [`angular/README.md`](./angular/README.md).

---

## Licence & attribution

Released under the [MIT licence](./LICENSE).

This is an independent project. It is not affiliated with, endorsed by or sponsored by
any advanced pivot table vendor, nor by the `react-pivottable` open-source project.
All product names and trademarks mentioned belong to their respective owners and are
used only for factual, descriptive comparison. No third-party pivot code is bundled:
the grid, aggregation engine and exporters are written from scratch in this repo.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow, code style and rules for agent-authored patches.

The repository is currently private. Public links will be added when the project is opened up.

## Built with AI

This project — library, demo site, tests and documentation — was developed end to
end using AI coding agents. It is published as is under the MIT licence, with no
warranty of any kind. Please review the source and test it in your own
environment before depending on it; use at your own discretion.
