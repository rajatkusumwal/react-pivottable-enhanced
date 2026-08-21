# react-pivottable-enhanced

A advanced-style pivot table for React: drag & drop fields, filters,
calculated values, subtotals, charts, drill-through, export and inline editing.
Aggregation runs in the browser by default and can be moved to a backend
service by passing a different engine.

This is the reference manual for the package. The repo root `README.md` covers
the demo site; everything a consuming app needs is here.

- Source code: [github.com/rajatkusumwal/react-pivottable-enhanced](https://github.com/rajatkusumwal/react-pivottable-enhanced)
- Issues: [github.com/rajatkusumwal/react-pivottable-enhanced/issues](https://github.com/rajatkusumwal/react-pivottable-enhanced/issues)
- Contributing: [CONTRIBUTING.md](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/CONTRIBUTING.md)

## Contents

1. [Feature list](#feature-list)
2. [For AI coding agents](#for-ai-coding-agents)
3. [Install](#install)
4. [Hello pivot](#hello-pivot)
5. [Styling setup](#styling-setup)
6. [Props](#props)
7. [The report config](#the-report-config)
8. [Recipes](#recipes) — 14 copy-paste samples
9. [Backend aggregation](#backend-aggregation)
10. [Testing your integration](#testing-your-integration)
11. [Server-side rendering](#server-side-rendering)
12. [API reference](#api-reference)
13. [Troubleshooting](#troubleshooting)
14. [Using it from Angular](#using-it-from-angular)
15. [Publishing this package](#publishing-this-package)

## Feature list

Everything below ships in the package and is covered by the test suite. Each
line names the capability and, where it exists, the prop or export that turns it
on. "Not included" is listed honestly at the end so nobody plans around a gap.

**Grid**

- Layouts: compact form, classic (tabular) form, flat table — `config.layout`
- Virtualised rendering for thousands of rows
- Subtotals and grand totals, toggled per rows/columns, positioned top or bottom
- Expand/collapse members, drill up and down multilevel hierarchies
- Sort members, sort by a value column, multi-column sort in flat table (shift-click)
- Drag fields between rows, columns, measures and filters (`showDragDrop`)
- Column/row resizing, cell selection, copy, keyboard navigation, row/column highlight
- Selection summary bar (count, sum, average of selected cells)
- Inline cell editing with proportional write-back (`allowEditing`, `onCellEdit`)
- Grid title, custom captions for fields and measures, show/hide headers

**Filters**

- Member checkbox filters with a search box
- Conditional filters for string, number, date and time fields
- Top/bottom N value filters
- Report (page) filter area, toggleable
- Chart-level filters; filters can be pushed to the backend as subqueries

**Field list**

- Dockable field list panel and dialog, searchable, with Expand All
- Folders, hierarchies and sublevels, custom item ordering
- Multiple fields in rows/columns, multiple measures, same field aggregated twice
- String, date and time fields usable as measures
- UI for adding calculated values; open/close the list from props

**Aggregation**

- `sum`, `count`, `distinctCount`, `average`, `median`, `product`, `min`, `max`,
  population and sample standard deviation
- Display modes: % of total, % of row, % of column, % of parent row/column,
  index, difference and % difference, running totals
- `registerAggregator` for custom functions; per-field allow-lists

**Calculated values**

- Formula editor in the UI plus `config.calculated` in code
- Formulas across several measures, grand-total-aware
- KPI fields with status thresholds (`computeKpiStatus`)

**Charts**

- Column, bar, line, scatter, pie, stacked column, combined column + line, heatmap
- Split view (grid + chart), tooltips, legend and title options
- Click a bar or legend entry to filter or drill down

**Drill-through**

- Drill-through dialog from any grid cell or chart point
- Configurable slice, column selection, sorting, row limit
- Export the drill-through view itself

**Toolbar and UI**

- Built-in toolbar: layout switches, totals, export, print, language, clear
- Save / open a report, share a report by link (`buildReportUrl`)
- Conditional formatting UI and number formatting UI
- Fullscreen mode, right-click context menu, fully customisable/hideable toolbar

**Export and print**

- Excel (`.xls` HTML workbook), CSV, TSV, HTML, JSON
- Print / PDF through the browser print dialog
- Custom headers and footers, drill-through export, copy to clipboard

**Data sources**

- In-browser JSON arrays and CSV (file, URL or paste)
- CSV dialect options: separator, decimal mark, thousands separator
- Any backend via `createBackendEngine` / `createCustomEngine`
- Server-side aggregation for very large (1 GB+) datasets
- Update data without resetting the current report

**Options, styling and security**

- Full report state save/restore as JSON (`config` + `onConfigChange`)
- Localisation packs (`locale`, `locales`, `getLocale`), read-only mode
- Theme tokens you can override, custom cell renderers, custom toolbar
- Role-based access: `permissions`, `secureRows`, `visibleFields`, `can`
- No data ever leaves your app unless you configure a backend engine

**Not included** (so you can plan around it)

- Direct database connectors (SQL, MongoDB, Elasticsearch) and OLAP/XMLA — connect
  through your own API with a backend engine instead
- Native PDF or PNG writers (printing covers PDF)
- Angular, Vue, Svelte or Blazor wrappers — React only
- Vendor support, SLA or a theme-builder tool

## For AI coding agents

Read this section first; it is enough to integrate the package correctly
without opening any other file.

**Quick facts**

| Key             | Value                                                                                  |
| --------------- | -------------------------------------------------------------------------------------- |
| Package         | `react-pivottable-enhanced`                                                            |
| Entry component | `PivotStudio` (named export; there is **no** default export)                           |
| Styles          | `import "react-pivottable-enhanced/styles.css"` — required                             |
| Styling engine  | None required — `styles.css` is compiled and self-contained                            |
| Peers           | `react` and `react-dom` (18.2+ or 19)                                                  |
| Runtime deps    | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `lucide-react`, `recharts` |
| Rendering       | Client only — wrap in a client boundary / dynamic import under SSR                     |
| Data shape      | `Array<Record<string, string \| number \| null>>` (flat rows, one object per record)   |

**Minimum viable integration** (copy verbatim, then change the data):

```tsx
"use client";
import { PivotStudio, inferFields, createDefaultConfig } from "react-pivottable-enhanced";
import "react-pivottable-enhanced/styles.css";

export function Reports({ rows }: { rows: Record<string, string | number | null>[] }) {
  return (
    <PivotStudio
      data={rows}
      fields={inferFields(rows)}
      initialConfig={createDefaultConfig({
        rows: ["region"],
        cols: ["year"],
        values: [{ field: "revenue", aggregator: "sum" }],
      })}
    />
  );
}
```

**Rules — violating these is the cause of almost every failed integration**

1. Import named exports only: `import { PivotStudio } from "react-pivottable-enhanced"`.
2. Always import `react-pivottable-enhanced/styles.css` once, or the grid
   renders unstyled. No Tailwind setup is needed — the file is compiled.
3. A report needs at least one entry in `values`; otherwise the grid is empty.
4. Field names in `rows`, `cols`, `values` and filters must match keys present
   in the data records exactly (case-sensitive).
5. Do not render on the server. Under Next.js App Router mark the wrapper
   `"use client"`; under Pages Router use `dynamic(..., { ssr: false })`.
6. Do not restyle internals with `!important` overrides — use the `theme` prop
   and the CSS custom properties from `styles.css`.
7. Keep `data` referentially stable (`useMemo`) — a new array identity on every
   render re-aggregates the whole dataset.
8. For datasets above ~100k rows use a backend engine
   (`createBackendEngine`) instead of shipping rows to the browser.

**Task → API map**

| Task                            | Use                                                      |
| ------------------------------- | -------------------------------------------------------- |
| Build field metadata from rows  | `inferFields(rows)`                                      |
| Create a starting report        | `createDefaultConfig({ rows, cols, values })`            |
| Save / restore a report         | `config` + `onConfigChange` props                        |
| Share a report by URL           | `buildReportUrl`, `readReportFromUrl`                    |
| Aggregate on a server           | `engine={createBackendEngine({ endpoint })}`             |
| Fake a backend in tests         | `createMockPivotApi()`                                   |
| Add a custom aggregation        | `registerAggregator(name, fn)`                           |
| Add a derived measure           | `config.calculated` + `applyCalculatedFields`            |
| Restrict what a user may see/do | `permissions` prop, `secureRows`, `visibleFields`, `can` |
| Export / print                  | `exportMatrix`, `printMatrix`, `copyMatrix`              |
| Translate the UI                | `locale` prop, `locales`, `getLocale`                    |

Full prop table in [Props](#props); every scenario above has a worked example in
[Recipes](#recipes).

## Install

```bash
npm i react-pivottable-enhanced
```

That pulls in the only runtime deps: `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `lucide-react` and `recharts`. `react` and `react-dom`
(18.2+ or 19) stay peer dependencies, so the host app keeps one copy.

Not needed: a router, shadcn/ui, Radix, `clsx`, `tailwind-merge`, or a backend.

## Hello pivot

```tsx
import { PivotStudio, sampleData, sampleFields } from "react-pivottable-enhanced";
import "react-pivottable-enhanced/styles.css";

export function Reports() {
  return <PivotStudio data={sampleData} fields={sampleFields} />;
}
```

With your own records, infer the field metadata and pick a starting report:

```tsx
import { PivotStudio, inferFields, createDefaultConfig } from "react-pivottable-enhanced";

const rows = [
  { region: "EMEA", country: "France", year: 2024, revenue: 1200, cost: 700 },
  { region: "EMEA", country: "Spain", year: 2024, revenue: 900, cost: 610 },
  { region: "APAC", country: "Japan", year: 2025, revenue: 1500, cost: 880 },
];

const fields = inferFields(rows); // [{ name: "region", type: "string" }, …]

const config = createDefaultConfig({
  rows: ["region", "country"],
  cols: ["year"],
  values: [{ field: "revenue", aggregator: "sum", caption: "Revenue" }],
});

<PivotStudio data={rows} fields={fields} initialConfig={config} />;
```

`inferFields` guesses `string | number | date | time` from the first non-empty
value of each key. Declare fields by hand when you want captions, folders,
hierarchies or restricted aggregations (see [Field metadata](#field-metadata)).

## Styling setup

No Tailwind setup is required. `react-pivottable-enhanced/styles.css` is
compiled at build time and contains Tailwind preflight, every utility class the
pivot renders, the theme tokens and the grid component CSS:

```css
/* app.css */
@import "react-pivottable-enhanced/styles.css";
```

Apps that already run Tailwind v4 and prefer to compile the utilities themselves
can import the raw tokens instead and scan the package source:

```css
@import "tailwindcss";
@source "../node_modules/react-pivottable-enhanced/dist";
@import "react-pivottable-enhanced/theme.css";
```

On Tailwind v3, add the package to `content` and map the tokens instead:

```js
// tailwind.config.js
export default {
  content: ["./src/**/*.{ts,tsx}", "./node_modules/react-pivottable-enhanced/dist/**/*.js"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        surface: "var(--surface)",
      },
    },
  },
};
```

The `:root` / `.dark` variables live in `react-pivottable-enhanced/styles.css`;
override any of them in your own CSS to re-skin the grid:

```css
:root {
  --primary: oklch(0.55 0.17 255);
  --radius: 0.5rem;
}
```

## Props

| Prop                          | Type                     | Default         | What it does                                     |
| ----------------------------- | ------------------------ | --------------- | ------------------------------------------------ |
| `data`                        | `PivotRow[]`             | —               | Records to analyse (local engine)                |
| `fields`                      | `FieldDef[]`             | —               | Field metadata; `inferFields(rows)` can build it |
| `initialConfig`               | `Partial<PivotConfig>`   | —               | Starting report (uncontrolled)                   |
| `config` / `onConfigChange`   | `PivotConfig` / callback | —               | Fully controlled report state                    |
| `engine`                      | `PivotEngineAdapter`     | local           | Swap in backend aggregation                      |
| `datasetId`                   | `string`                 | —               | Dataset handle sent with backend queries         |
| `onUploadToBackend`           | `(file) => Promise<…>`   | —               | Send uploads to your service instead of memory   |
| `fieldsUi`                    | `"dialog" \| "sidebar"`  | `"dialog"`      | Popup field list, or a docked panel              |
| `showToolbar` / `showSidebar` | `boolean`                | `true`          | Hide chrome when the host supplies its own       |
| `allowFileUpload`             | `boolean`                | `false`         | Show the CSV/JSON drop bar                       |
| `permissions`                 | `Permissions`            | all on          | Turn off export, drill-through, editing, …       |
| `onDataChange`                | `(rows) => void`         | —               | Inline cell edits written back                   |
| `title`                       | `string`                 | `"Pivot table"` | Header text                                      |
| `className`                   | `string`                 | —               | Wrapper class                                    |

## The report config

`PivotConfig` is one plain object — the whole report state. Build it with
`createDefaultConfig(partial)` so new keys always get sane defaults.

```ts
const config = createDefaultConfig({
  rows: ["region", "country"], // row area, in order
  cols: ["year", "quarter"], // column area
  values: [{ field: "revenue", aggregator: "sum" }],
  filters: [], // see the filter recipes
  calculated: [], // formula fields
  conditionalFormats: [], // colour rules
  showGrandTotals: true,
  grandTotalsPosition: "bottom", // or "top"
  showRowTotals: true,
  showSubTotals: true,
  expandAll: false,
  layout: "compact", // "compact" | "classic" | "flat"
  sort: { field: "revenue", dir: "desc" },
  showSpreadsheetHeaders: false,
  repeatMemberLabels: false,
  dragAndDrop: true,
  editing: false,
  locale: "en",
  theme: { accent: "#2f6feb", density: "comfortable", stripe: true /* … */ },
  chart: { visible: false, type: "stackedBar", position: "bottom" },
  drillThrough: { maxRows: 1000 },
  csv: { delimiter: ",", decimalSeparator: ".", thousandsSeparator: "" },
});
```

### Field metadata

```ts
import type { FieldDef } from "react-pivottable-enhanced";

const fields: FieldDef[] = [
  {
    name: "region",
    caption: "Region",
    type: "string",
    folder: "Geography",
    hierarchy: "Geo",
    level: 1,
  },
  {
    name: "country",
    caption: "Country",
    type: "string",
    folder: "Geography",
    hierarchy: "Geo",
    level: 2,
  },
  { name: "orderDate", caption: "Order date", type: "date", folder: "Time" },
  {
    name: "unitPrice",
    caption: "Unit price",
    type: "number",
    aggregators: ["average", "min", "max"],
  },
  {
    name: "revenue",
    caption: "Revenue",
    type: "number",
    kpi: { goal: "targetRevenue", direction: "higher", warningAt: 0.9 },
  },
];
```

- `folder` groups fields in the field list.
- `hierarchy` + `level` enable drill up/down across levels.
- `aggregators` restricts the menu (no `sum` on a unit price).
- `kpi` shows a status indicator against a goal field or a fixed number.

## Recipes

### 1. Controlled report state (save & restore)

```tsx
import { useState } from "react";
import { PivotStudio, createDefaultConfig, type PivotConfig } from "react-pivottable-enhanced";

export function SavedReport({ saved }: { saved?: PivotConfig }) {
  const [config, setConfig] = useState<PivotConfig>(
    saved ??
      createDefaultConfig({
        rows: ["category"],
        values: [{ field: "revenue", aggregator: "sum" }],
      }),
  );

  return (
    <>
      <button
        onClick={() => fetch("/api/reports", { method: "POST", body: JSON.stringify(config) })}
      >
        Save this report
      </button>
      <PivotStudio data={rows} fields={fields} config={config} onConfigChange={setConfig} />
    </>
  );
}
```

`PivotConfig` is JSON-serialisable — store it in your database as-is.

### 2. Share a report by link

```tsx
import { buildReportUrl, readReportFromUrl, REPORT_PARAM } from "react-pivottable-enhanced";

const url = buildReportUrl(location.href, config); // …?report=<base64>
const incoming = readReportFromUrl(location.href); // PivotConfig | null on load

<PivotStudio data={rows} fields={fields} initialConfig={incoming ?? undefined} />;
```

The toolbar's share button does the same thing and copies the URL.

### 3. Measures, formats and "show values as"

```ts
values: [
  {
    field: "revenue",
    aggregator: "sum",
    caption: "Revenue",
    format: { currency: "USD", decimals: 0 },
  },
  { field: "orderId", aggregator: "distinctCount", caption: "Orders" },
  { field: "marginPct", aggregator: "average", format: { decimals: 1, suffix: "%" } },
  {
    field: "revenue",
    aggregator: "sum",
    caption: "% of total",
    displayMode: "percentOfGrandTotal",
  },
];
```

Aggregators: `sum`, `count`, `distinctCount`, `average`, `median`, `min`, `max`,
`product`, `stdDev`, `variance`, `first`, `last` — plus anything you register.
Display modes cover % of grand/row/column/parent totals, differences, running
totals and `index`.

### 4. A custom aggregator

```ts
import { registerAggregator } from "react-pivottable-enhanced";

registerAggregator("p95", (values) => {
  const nums = values.filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
  return nums.length ? (nums[Math.floor(nums.length * 0.95)] ?? null) : null;
});

values: [{ field: "revenue", aggregator: "p95", caption: "P95 revenue" }];
```

### 5. Calculated values (row and aggregate scope)

```ts
calculated: [
  // per record, before aggregation
  { name: "netRevenue", caption: "Net revenue", formula: "[revenue] - [returnedValue]" },
  // per cell, after aggregation, with access to totals
  {
    name: "shareOfTotal",
    caption: "Share of total",
    scope: "aggregate",
    aggregator: "sum",
    formula: "[revenue] / grandTotal([revenue]) * 100",
    format: { decimals: 1, suffix: "%" },
  },
];
```

Total functions available in aggregate scope: `grandTotal`, `rowTotal`,
`columnTotal`, `parentRowTotal`, `parentColumnTotal`. Validate user-typed
formulas with `validateFormula(formula, fieldNames)` before saving them.

### 6. Filters — members, conditions, top N, server subquery

```ts
filters: [
  { kind: "values", field: "region", mode: "include", members: ["EMEA", "APAC"] },
  { kind: "condition", field: "revenue", operator: "gte", value: 1000 },
  {
    kind: "condition",
    field: "orderDate",
    operator: "between",
    value: "2024-01-01",
    value2: "2024-12-31",
    valueType: "date",
  },
  {
    kind: "top",
    field: "country",
    measure: "revenue",
    aggregator: "sum",
    direction: "top",
    count: 10,
  },
  {
    kind: "subquery",
    field: "customerName",
    measure: "revenue",
    aggregator: "sum",
    operator: "gt",
    value: 50000,
  },
];
```

### 7. Conditional formatting

```ts
conditionalFormats: [
  { field: "marginPct", operator: "lt", value: 10, color: "#7f1d1d", background: "#fee2e2" },
  { field: "marginPct", operator: "gte", value: 30, color: "#14532d", background: "#dcfce7" },
];
```

Users can add the same rules from the toolbar's format dialog.

### 8. Charts, split view and chart drill-down

```ts
chart: {
  visible: true,
  type: "columnLine", // bar | stackedBar | line | area | pie | columnLine
  position: "right",  // split view next to the grid; "bottom" stacks it
  lineSeries: ["Margin %"],
  drillRows: [],
  drillCols: [],
  hiddenSeries: [],
}
```

Clicking a legend entry hides a series; clicking a column drills into the next
row level; right-clicking offers drill-through to the underlying records.

### 9. Drill-through slice

```ts
drillThrough: {
  fields: ["orderId", "orderDate", "customerName", "revenue"],
  sort: { field: "revenue", dir: "desc" },
  maxRows: 500,
}
```

### 10. Inline editing with write-back

```tsx
const [rows, setRows] = useState(initialRows);

<PivotStudio
  data={rows}
  fields={fields}
  initialConfig={createDefaultConfig({
    editing: true,
    rows: ["region"],
    values: [{ field: "revenue", aggregator: "sum" }],
  })}
  onDataChange={(next) => {
    setRows(next);
    fetch("/api/rows", { method: "PUT", body: JSON.stringify(next) });
  }}
/>;
```

Editing an aggregated cell spreads the delta proportionally across the records
behind it (`applyCellEdit` is exported if you want the same maths server-side).

### 11. Permissions and row-level security

```tsx
<PivotStudio
  data={rows}
  fields={fields}
  permissions={{
    allowedFields: ["region", "country", "revenue", "orderCount"],
    maskedFields: ["customerName"],
    rowFilter: (row) => row.region === currentUser.region,
    allowExport: false,
    allowDrillThrough: false,
    readOnly: true,
  }}
/>
```

`readOnly` freezes the report (no drag & drop, no field list edits) — handy for
dashboards. Masked values render as `••••`.

### 12. Export and print with headers/footers

```ts
import { exportMatrix, matrixFromResult } from "react-pivottable-enhanced";

// From the report config: the toolbar uses these two lines
exportHeader: "Acme Corp — confidential\nQ3 revenue by region",
exportFooter: "Generated by Acme Analytics",
```

```ts
// Programmatic export of a result you already have
const matrix = matrixFromResult(result, "en", "Q3 revenue", {
  header: "Acme Corp — confidential",
  footer: "Generated by Acme Analytics",
});
exportMatrix(matrix, "csv"); // "csv" | "tsv" | "html" | "json" | "excel" | "pdf"
// printMatrix(matrix) opens the browser print dialog with the same layout
```

### 13. CSV dialect (European files, tabs, semicolons)

```ts
import { detectCsvOptions, parseCsv } from "react-pivottable-enhanced";

csv: { delimiter: ";", decimalSeparator: ",", thousandsSeparator: "." }
// or let the file decide:
const opts = detectCsvOptions(text);
const rows = parseCsv(text, opts);
```

### 14. Localisation

```ts
import { locales, getLocale } from "react-pivottable-enhanced";

<PivotStudio data={rows} fields={fields} initialConfig={createDefaultConfig({ locale: "de" })} />;
```

Pass your own strings by merging with `getLocale("en")` and registering the
result in `locales`.

## Backend aggregation

```tsx
import { PivotStudio, createBackendEngine } from "react-pivottable-enhanced";

const engine = createBackendEngine({
  baseUrl: "https://api.example.com", // endpoints appended: /api/pivot/query, …
  datasetId: "sales",
  headers: { Authorization: `Bearer ${token}` },
  // paths: { query: "/v2/pivot" }, fetchImpl: myFetch,
});

<PivotStudio fields={fields} data={[]} engine={engine} datasetId="sales" />;
```

Every engine returns the same `PivotResult`, so the browser engine and a service
(e.g. Spring Boot + DuckDB) stay swappable. The engine posts a `PivotQuery`
(rows, cols, measures, filters, expansions, sort, paging) and expects the
aggregated matrix back; the request/response JSON is documented in full in the
repo root `README.md`.

Other engines:

```ts
import {
  createHybridEngine,
  createCustomEngine,
  createServerAggregationEngine,
} from "react-pivottable-enhanced";

// Local until the data gets big, then the service:
const hybrid = createHybridEngine({ baseUrl: "https://api.example.com", threshold: 100_000 });

// Any backend at all — you write two functions:
const custom = createCustomEngine({
  id: "graphql",
  async query(q) {
    return await myGraphQlPivot(q); // a ready-to-render PivotResult
  },
  // or aggregate(q) -> already grouped rows, or fetchRows(q) -> raw records
  async drillThrough(q) {
    return await myRecords(q); // PivotRow[]
  },
  async getMembers(field, search) {
    return await myDistinctValues(field, search);
  },
});

// 1GB+ files registered server-side and streamed:
const big = createServerAggregationEngine({
  baseUrl: "https://api.example.com",
  datasetId: "orders-2024",
  pageSize: 5_000, // server-side windowing
});
```

## Testing your integration

`createMockPivotApi()` implements the REST contract in memory, so integration
tests need no server:

```ts
import {
  createMockPivotApi,
  createBackendEngine,
  sampleData,
  sampleFields,
} from "react-pivottable-enhanced";

const api = createMockPivotApi({ rows: sampleData, fields: sampleFields, datasetId: "sales" });

const engine = createBackendEngine({
  baseUrl: "https://api.test",
  fetchImpl: api.fetch, // same routes and payloads as the real service
});
const result = await engine.query({
  datasetId: "sales",
  rows: ["region"],
  cols: [],
  measures: [{ field: "revenue", aggregator: "sum" }],
  filters: [],
});

expect(result.rows.length).toBeGreaterThan(0);
expect(api.requests[0]?.path).toBe("/api/pivot/query"); // and api.datasets holds the edits
```

Pure helpers are exported for unit tests too: `buildLocalResult`, `aggregate`,
`applyFilters`, `evaluateFormula`, `applyDisplayMode`, `grandTotal`, `toCsv`.

## Server-side rendering

`PivotStudio` is a client component (it reads `window`/`sessionStorage` and uses
drag & drop). In Next.js App Router add `"use client"` to the file that renders
it, or load it with `next/dynamic` and `{ ssr: false }`:

```tsx
"use client";
import dynamic from "next/dynamic";

const PivotStudio = dynamic(() => import("react-pivottable-enhanced").then((m) => m.PivotStudio), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" />,
});
```

In Vite/TanStack apps, gate the render on a `mounted` flag set in `useEffect`.

## API reference

Grouped list of the public exports (all named, no default export):

- **Component**: `PivotStudio`, and the pieces it is built from — `PivotGrid`,
  `PivotToolbar`, `PivotSidebar`, `PivotChart`, `FieldListPanel`,
  `FieldListDialog`, `GridFieldBar`, `FieldChip`, `DropArea`, `FilterEditor`,
  `MemberFilterPopover`, `DrillThroughDialog`, `FormatDialog`,
  `GridContextMenu`, `ChartDrillBar`, `DataSourceBar`.
- **Engines**: `createLocalEngine`, `createBackendEngine`, `createHybridEngine`,
  `createCustomEngine`, `createServerAggregationEngine`, `createMockPivotApi`,
  `registerRemoteDataset`, `streamCsvRows`, `shouldOffload`.
- **Config**: `createDefaultConfig`, `defaultTheme`, `defaultPermissions`,
  `defaultCsvOptions`, plus types `PivotConfig`, `FieldDef`, `ValueDef`,
  `FilterDef`, `CalculatedField`, `Permissions`, `ChartConfig`, `PivotTheme`.
- **Data**: `inferFields`, `parseCsv`, `loadCsvUrl`, `loadJsonUrl`,
  `readFileAsRows`, `sampleData`, `sampleFields`, `sampleCsv`,
  `generateSalesData`, `sampleHierarchies`.
- **Maths**: `aggregate`, `aggregators`, `registerAggregator`, `applyFilters`,
  `uniqueMembers`, `applyCalculatedFields`, `evaluateFormula`,
  `validateFormula`, `buildChartData`, `applyDisplayMode`, `grandTotal`,
  `computeKpiStatus`, `naturalSort`, `formatNumber`, `formatPercent`.
- **Export**: `exportMatrix`, `matrixFromResult`, `matrixFromRows`,
  `matrixFromTable`, `printMatrix`, `copyMatrix`, `toCsv`, `toTsv`, `toHtml`,
  `toJson`, `downloadFile`.
- **Sharing / security / i18n**: `encodeReport`, `decodeReport`,
  `buildReportUrl`, `readReportFromUrl`, `secureRows`, `visibleFields`, `can`,
  `locales`, `getLocale`.

## Troubleshooting

| Symptom                                 | Cause and fix                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Grid renders unstyled / black on white  | `react-pivottable-enhanced/styles.css` was never imported                         |
| Colours ignore your brand               | Import `react-pivottable-enhanced/styles.css` **before** your own token overrides |
| `window is not defined` at build time   | Rendered during SSR — see [Server-side rendering](#server-side-rendering)         |
| Nothing in the grid                     | `values` is empty; a report needs at least one measure                            |
| `sum` missing from a field's menu       | The field declares a narrower `aggregators` list, or is not `type: "number"`      |
| Numbers read as text after a CSV import | Wrong CSV dialect — pass `csv` options or use `detectCsvOptions`                  |
| Uploaded file disappears on reload      | Uploads live in `sessionStorage` (8 MB cap) by design; use `onUploadToBackend`    |

## Using it from Angular

Angular apps use the companion wrapper package, which mounts this component inside an
Angular component. Same features, same engine, same config object.

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
    [initialConfig]="{ rows: ['Region'], values: [{ field: 'Revenue', aggregator: 'sum' }] }"
    (configChange)="save($event)"
  ></pivot-studio>`,
})
export class ReportsComponent {
  data = sampleData;
  fields = sampleFields;
  save(config: unknown) {}
}
```

Inputs mirror the props above one-for-one; `onConfigChange` / `onDataChange` become the
`(configChange)` / `(dataChange)` outputs, emitted inside the Angular zone. The theme
stylesheet is added once in `angular.json`. Full reference:
[`angular/README.md`](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/angular/README.md).

## Publishing this package

The component source lives here, in `standalone/src/pivot/` — this package is the
single home of the pivot code, and the demo site in the repo root imports it via the
`react-pivottable-enhanced` path alias. Build the package with:

```bash
cd standalone
npm install
npm run build      # bundle + types + theme css -> dist/
npm publish        # prepublishOnly re-runs the build
```

### Distribute the `dist/` folder locally

You can share the built package without publishing to npm. Two common ways:

#### Option A: pack a tarball and install it

From the `standalone/` directory:

```bash
npm run build
npm pack           # creates react-pivottable-enhanced-1.0.1.tgz
```

Copy the `.tgz` file to the target machine or project, then install it:

```bash
npm install /path/to/react-pivottable-enhanced-1.0.1.tgz
# or with yarn
yarn add file:/path/to/react-pivottable-enhanced-1.0.1.tgz
```

In a consuming app the imports stay the same:

```tsx
import { PivotStudio, sampleData, sampleFields } from "react-pivottable-enhanced";
import "react-pivottable-enhanced/styles.css";
```

#### Option B: install from a local directory

If the `standalone/` folder is already on the target machine (e.g. cloned repo,
shared network drive), install straight from that folder:

```bash
npm install /path/to/standalone
# or
npm install /path/to/standalone/react-pivottable-enhanced-1.0.1.tgz
```

This works because `standalone/package.json` declares the correct `main`, `module`,
`types` and `exports` entries, and the `files` array ships only `dist/`, `README.md`
and `LICENSE`. Peer dependencies (`react`, `react-dom`) and runtime dependencies
(`@dnd-kit/*`, `lucide-react`, `recharts`) are installed by npm alongside the tarball.

### Pre-publish checklist

Run from the repo root:

```bash
bun run test          # unit suite (incl. standalone/src) + package export tests
bun run test:package  # builds the package and tests dist/ as a consumer would
```

`test:package` fails if the bundle is missing, if the types or theme CSS are not
emitted, if React (or another peer/runtime dependency) gets inlined, or if
`PivotStudio` cannot render from the built artifact.

Tests live next to the code in `standalone/src/pivot/` but never ship: the build
excludes `*.test.*` and `files` publishes only `dist` and `README.md`.

### What the suite covers

364 tests across 24 files (including the Angular wrapper suite). The groups worth knowing about:

| Area             | File(s)                                               | What is asserted                                                               |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Core pivoting    | `pivot-core.test.ts`, `display-modes.test.ts`         | grouping, subtotals, grand totals, sorting, "% of" display modes               |
| Edge cases       | `edge-cases.test.ts`                                  | empty input, single row, blanks/nulls, wrong types, missing fields             |
| Grid UI          | `ui/PivotGrid.test.tsx`                               | compact/classic/flat layouts, expand & collapse, selection, copy, windowing    |
| Full component   | `PivotStudio.test.tsx`                                | drag & drop, filters, calculated values, drill-down, import/clear              |
| Charts & drill   | `charts.test.tsx`, `drillthrough.test.tsx`            | chart series, chart filtering, drill-through records and limits                |
| Reporting        | `reporting-ui.test.tsx`, `report-link.test.ts`        | export matrices, headers/footers, share-by-link round-trip                     |
| Backend contract | `engines/backend.test.ts`, `engines/mock-api.test.ts` | request shape, headers, dataset ids, paging against a mocked REST API          |
| Backend failures | `engines/backend-failures.test.ts`                    | 500/401/413, dropped connection, abort/timeout, non-JSON body, hybrid fallback |
| Accessibility    | `accessibility.test.tsx`                              | grid role & labels, Tab focus, arrow/shift navigation, Escape on popups        |
| Performance      | `performance.test.ts`                                 | 100k-row aggregate, filter and drill-through stay inside time budgets          |
| Persistence      | `session-dataset.test.ts`                             | reload cache: round-trip, oversized payload, corrupt JSON, storage disabled    |
| Angular wrapper  | `angular/src/*.test.ts`                               | mount/teardown, input updates, zone-correct outputs, NgModule path             |
| Packaging        | `standalone/tests/*`                                  | built `dist/` renders, types emit, peers stay external                         |

Coverage is enforced from the repo root:

```bash
bun run test:coverage   # fails below 70% lines/functions/statements, 65% branches
```

Current numbers for `standalone/src/pivot`: 86% lines, 85% statements, 81%
functions, 77% branches. The thresholds are floors, not targets — they exist so
a new module cannot land completely untested.

Performance budgets live at the top of `performance.test.ts`; raise them only
with a measurement that justifies it.

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
