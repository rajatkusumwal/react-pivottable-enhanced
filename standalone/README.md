# inhouse-grid-monster

A Flexmonster-style pivot table for React: drag & drop fields, filters,
calculated values, subtotals, charts, drill-through, export and inline editing.
Aggregation runs in the browser by default and can be moved to a backend
service by passing a different engine.

This is the reference manual for the package. The repo root `README.md` covers
the demo site; everything a consuming app needs is here.

## Contents

1. [Install](#install)
2. [Hello pivot](#hello-pivot)
3. [Tailwind setup](#tailwind-setup)
4. [Props](#props)
5. [The report config](#the-report-config)
6. [Recipes](#recipes) — 14 copy-paste samples
7. [Backend aggregation](#backend-aggregation)
8. [Testing your integration](#testing-your-integration)
9. [Server-side rendering](#server-side-rendering)
10. [API reference](#api-reference)
11. [Troubleshooting](#troubleshooting)
12. [Publishing this package](#publishing-this-package)

## Install

```bash
npm i inhouse-grid-monster
```

That pulls in the only runtime deps: `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `lucide-react` and `recharts`. `react` and `react-dom`
(18.2+ or 19) stay peer dependencies, so the host app keeps one copy.

Not needed: a router, shadcn/ui, Radix, `clsx`, `tailwind-merge`, or a backend.

## Hello pivot

```tsx
import { PivotStudio, sampleData, sampleFields } from "inhouse-grid-monster";
import "inhouse-grid-monster/styles.css";

export function Reports() {
  return <PivotStudio data={sampleData} fields={sampleFields} />;
}
```

With your own records, infer the field metadata and pick a starting report:

```tsx
import { PivotStudio, inferFields, createDefaultConfig } from "inhouse-grid-monster";

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

## Tailwind setup

Tailwind CSS must be present in the host app (v4 recommended) and must scan the
package so the utility classes survive purging:

```css
/* app.css */
@import "tailwindcss";
@source "../node_modules/inhouse-grid-monster/dist";
@import "inhouse-grid-monster/styles.css"; /* semantic colour tokens */
```

On Tailwind v3, add the package to `content` and map the tokens instead:

```js
// tailwind.config.js
export default {
  content: ["./src/**/*.{ts,tsx}", "./node_modules/inhouse-grid-monster/dist/**/*.js"],
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

The `:root` / `.dark` variables live in `inhouse-grid-monster/styles.css`;
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
| `fieldsUi`                    | `"dialog" \| "sidebar"`  | `"dialog"`      | Flexmonster popup field list, or a docked panel  |
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
import type { FieldDef } from "inhouse-grid-monster";

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
import { PivotStudio, createDefaultConfig, type PivotConfig } from "inhouse-grid-monster";

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
import { buildReportUrl, readReportFromUrl, REPORT_PARAM } from "inhouse-grid-monster";

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
import { registerAggregator } from "inhouse-grid-monster";

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
import { exportMatrix, matrixFromResult } from "inhouse-grid-monster";

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
import { detectCsvOptions, parseCsv } from "inhouse-grid-monster";

csv: { delimiter: ";", decimalSeparator: ",", thousandsSeparator: "." }
// or let the file decide:
const opts = detectCsvOptions(text);
const rows = parseCsv(text, opts);
```

### 14. Localisation

```ts
import { locales, getLocale } from "inhouse-grid-monster";

<PivotStudio data={rows} fields={fields} initialConfig={createDefaultConfig({ locale: "de" })} />;
```

Pass your own strings by merging with `getLocale("en")` and registering the
result in `locales`.

## Backend aggregation

```tsx
import { PivotStudio, createBackendEngine } from "inhouse-grid-monster";

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
} from "inhouse-grid-monster";

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
} from "inhouse-grid-monster";

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

const PivotStudio = dynamic(() => import("inhouse-grid-monster").then((m) => m.PivotStudio), {
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

| Symptom                                 | Cause and fix                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| Grid renders unstyled / black on white  | Tailwind is not scanning `dist`. Add the `@source` line (v4) or `content` entry |
| Colours ignore your brand               | Import `inhouse-grid-monster/styles.css` **before** your own token overrides    |
| `window is not defined` at build time   | Rendered during SSR — see [Server-side rendering](#server-side-rendering)       |
| Nothing in the grid                     | `values` is empty; a report needs at least one measure                          |
| `sum` missing from a field's menu       | The field declares a narrower `aggregators` list, or is not `type: "number"`    |
| Numbers read as text after a CSV import | Wrong CSV dialect — pass `csv` options or use `detectCsvOptions`                |
| Uploaded file disappears on reload      | Uploads live in `sessionStorage` (8 MB cap) by design; use `onUploadToBackend`  |

## Publishing this package

The component source lives here, in `standalone/src/pivot/` — this package is the
single home of the pivot code, and the demo site in the repo root imports it via the
`inhouse-grid-monster` path alias. Build the package with:

```bash
cd standalone
npm install
npm run build      # bundle + types + theme css -> dist/
npm publish        # prepublishOnly re-runs the build
```

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
