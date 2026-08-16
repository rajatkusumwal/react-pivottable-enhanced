# Pivot Studio

A free, Flexmonster-like pivot table for React 19, built on the open-source
[react-pivottable](https://react-pivottable.js.org/) aggregation utilities with a
custom grid renderer on top. Drag-and-drop field list, subtotals, expand/collapse,
compact / classic / flat layouts, filters, calculated values, charts, drill-through,
exports, localisation and row-level security — in one component.

Aggregation is **pluggable**: it runs in the browser by default and can be handed to a
backend service (for example Spring Boot + DuckDB) without changing any UI code.

---

## 1. Install

```bash
npm i react-pivottable recharts @dnd-kit/core @dnd-kit/sortable lucide-react
```

Vite users — react-pivottable's UMD dependency references Node's `global`:

```ts
// vite.config.ts
export default defineConfig({ define: { global: "globalThis" } });
```

## 2. Use it

```tsx
import { PivotStudio, inferFields, createDefaultConfig } from "@/components/pivot";

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

Copy `src/components/pivot/` into any React 19 app — it has no app-specific imports
other than Tailwind tokens (`--color-border`, `--color-card`, …) and `@/lib/utils`.

### Props

| Prop | Type | Purpose |
| --- | --- | --- |
| `data` | `PivotRow[]` | Records for the local engine |
| `fields` | `FieldDef[]` | Captions, types, folders, hierarchy metadata (`inferFields()` helps) |
| `engine` | `PivotEngineAdapter` | Aggregation engine; defaults to the local one |
| `initialConfig` / `config` + `onConfigChange` | `PivotConfig` | Uncontrolled or controlled state |
| `permissions` | `Permissions` | `readOnly`, `allowExport`, `allowDrillThrough`, `deniedFields`, `maskedFields`, `rowFilter` |
| `fieldsUi` | `"dialog" \| "sidebar"` | Flexmonster-style popup (default) or docked panel |
| `allowFileUpload` | `boolean` | Show the CSV/JSON upload bar |
| `onUploadToBackend` | `(file) => Promise<{ datasetId, rowCount, fields }>` | Send uploads to your service instead of memory |
| `datasetId` | `string` | Dataset handle passed to the backend engine |
| `showToolbar` / `showSidebar` / `title` / `className` | | Presentation |

### Feature map

* **Grid** — compact / classic / flat layouts, subtotals, grand totals, expand & collapse,
  column resize, cell selection with a sum/avg/min/max bar, keyboard navigation, row & column
  hover highlight, spreadsheet headers, windowed rendering for large results,
  inline cell editing (`config.editing: true` or the "Edit cells" toolbar checkbox —
  double-click a value cell, type a number, press Enter; the change is written back to the
  underlying records, spread proportionally for `sum` measures, and `onDataChange` fires with
  the updated rows).
* **Filters** — member checkbox filters with search, conditional filters
  (number/text/date/time), top/bottom N, group conditions (subqueries), report-filter chips
  above the grid. Picking a field typed `date` in the filter editor switches it to a date
  picker with date wording ("is before", "is on or after", "is between", …) and sets
  `valueType: "date"`; a field typed `time` switches to a time picker with clock wording
  ("is after", "is at or before", …) and sets `valueType: "time"` — comparisons run on
  seconds since midnight, so `2024-02-01T18:45:00Z` and `18:45` compare equal.
  The **group condition** filter type adds `{ kind: "subquery" }`: keep only the members of a
  field whose nested aggregate passes a test (e.g. regions whose `sum(revenue) > 500`),
  which the backend runs as a SQL subquery.
* **Filter surfaces** — `config.showReportFilterArea` (toolbar "Filter area") shows or hides
  the report-filter strip above the grid; `config.showChartFilters` (toolbar "Chart filters")
  shows per-field member filter buttons above the chart that write back into `config.filters`.
* **Field list** — drag-and-drop between Filters / Columns / Rows / Measures (`@dnd-kit`).
  Drag & drop can be switched off with `config.dragAndDrop: false` (or the toolbar
  checkbox); the select menus keep every action available without dragging.
  Fields are grouped by `FieldDef.folder`, and fields sharing a `FieldDef.hierarchy` are
  nested under it and badged with their `FieldDef.level` (L1, L2 …). You can add a single
  sublevel or use **Add all levels** to add the whole drill path to Rows. The panel also has
  a search box (matching field, folder and hierarchy names), **Expand all** / **Collapse all**
  and a sort selector (data order, A → Z, Z → A).
* **Multiple measures** — `config.values` accepts any number of measures and the grid renders
  one leaf column per (column member x measure). The same field can appear several times with
  different aggregations (drop it on Measures again). Measures carry `type`, so string, date
  and time fields work as values too: they offer count, distinct count, min, max, first and
  last, and render as text (ISO dates and `HH:mm` times compare correctly).
* **Aggregations** — sum, count, distinct count, average, median, min, max, product,
  population/sample stdev, percent-of-total; add your own with `registerAggregator()`.
  `aggregatorsForType(type)` returns the aggregations valid for a field type and drives the
  measure menus.
* **Calculated values** — safe formula parser (no `eval`), e.g. `revenue - cost`.
* **Charts** — Recharts bar / stacked / line / area / pie with click-to-drill.
* **Drill-through** — click any number to inspect the source records.
* **Export & print** — Excel (.xls), CSV, TSV, HTML, JSON, clipboard, print/PDF.
* **Localisation** — bundled `en`, `fr`, `de`, `es`; locale-aware number formats.
* **Security** — `rowFilter` row-level security, field masking, denied fields, read-only mode.

---

## 3. Moving aggregation to a backend (Spring Boot + DuckDB)

Everything the grid renders is a `PivotResult`. Swap the engine and the UI is unchanged:

```tsx
import { PivotStudio, createBackendEngine, createHybridEngine } from "@/components/pivot";

const engine = createBackendEngine({
  baseUrl: "https://analytics.example.com",
  headers: () => ({ Authorization: `Bearer ${token}` }),
});

// Or: local for small datasets, backend above the threshold.
const hybrid = createHybridEngine({ baseUrl: "...", threshold: 50_000 });

<PivotStudio data={rows} fields={fields} engine={engine} datasetId={datasetId} allowFileUpload
  onUploadToBackend={uploadCsv} />
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
    { "field": "customerName", "aggregator": "distinctCount", "type": "string" },
    { "field": "orderDate", "aggregator": "min", "type": "date" },
    { "field": "orderTime", "aggregator": "max", "type": "time" }
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
      "valueType": "date"
    },
    {
      "kind": "condition",
      "field": "orderTime",
      "operator": "between",
      "value": "09:00",
      "value2": "17:00",
      "valueType": "time"
    },
    {
      "kind": "subquery",
      "field": "region",
      "measure": "revenue",
      "aggregator": "sum",
      "operator": "gt",
      "value": 500
    }
  ],
  "showSubTotals": true,
  "showGrandTotals": true,
  "grandTotalsPosition": "bottom",
  "layout": "compact",
  "collapsed": ["North"],
  "collapsedCols": ["Bikes"],
  "sort": { "by": 0, "direction": "desc" },
  "sorts": [{ "by": 0, "direction": "desc" }, { "by": "rows", "direction": "asc" }],
  "locale": "en",
  "limit": 500,
  "offset": 0,
  "datasetId": "sales-2026"
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
    { "field": "revenue", "caption": "Avg revenue", "aggregator": "average", "type": "number" }
  ],
  // One leaf column per (column member x measure); this maps leaf -> measure index.
  "measureIndexByLeaf": [0, 1],
  "rowTotalsByMeasure": [[576158, 1200]],
  "grandTotals": [2583335, 1345],
  "rowHeaders": [
    { "key": ["North"], "label": "North", "depth": 0, "kind": "member",
      "expandable": true, "expanded": true, "span": 1 },
    { "key": ["North", "Bikes"], "label": "Bikes", "depth": 1, "kind": "member",
      "expandable": false, "expanded": true, "span": 1 },
    { "key": ["North"], "label": "North total", "depth": 0, "kind": "subtotal",
      "expandable": false, "expanded": true, "span": 1 }
  ],
  "colHeaderRows": [[{ "key": ["Q1"], "label": "Q1", "depth": 0, "kind": "member",
                       "expandable": false, "expanded": true, "span": 1 }]],
  "colLeaves":     [{ "key": ["Q1"], "label": "Q1", "depth": 0, "kind": "member",
                      "expandable": false, "expanded": true, "span": 1 }],
  "cells":     [[147312], [43290], [147312]],
  "rowTotals": [576158, 222656, 576158],
  "colTotals": [608186],
  "grandTotal": 2583335,
  "sourceCount": 480,
  "meta": { "source": "backend", "queryId": "b12f" }
}
```

Rules the server must respect:

* `cells[i][j]` aligns with `rowHeaders[i]` and `colLeaves[j]`; use `null` for empty cells.
* Emit subtotal rows only when `showSubTotals` is true, and skip children of any path in
  `collapsed`.
* Multilevel drill: `collapsed` holds row member paths, `collapsedCols` holds column member
  paths (levels joined with `\u0000`). A collapsed column member becomes a single aggregated
  leaf: keep it in `colHeaderRows` with `expandable: true`, `expanded: false` and
  `rowSpan` covering the remaining column levels, and drop its descendants from `colLeaves`.
  Parent members that still have visible children carry `expandable: true, expanded: true`.
* `layout: "flat"` means one row per source record combination, no subtotals. `sorts` is the
  multi-column sort chain used by the flat layout (shift-click in the UI) and takes precedence
  over `sort`; `by: "rows"` sorts row members, a number sorts by that leaf column.
* `grandTotalsPosition` decides whether the `kind: "grand"` row is emitted first or last.
* `limit` / `offset` page the source records before aggregation.
* Condition filters carry an optional `valueType`
  (`"auto" | "number" | "text" | "date" | "time"`).
  With `"date"` the server must compare on the date timeline at **day granularity** —
  parse ISO dates (`2024-02-01`) and timestamps (`2024-02-01T18:45:00Z`), truncate both
  sides to UTC midnight, and treat unparseable values as non-matching. In SQL/DuckDB that is
  `CAST(field AS DATE) >= DATE '2024-02-01'` (and `BETWEEN … AND …` for `between`).
  Date operators map to: `lt` is before, `lte` is on or before, `gt` is after,
  `gte` is on or after, `eq` is on, `neq` is not on, `between` is between (inclusive).
* With `valueType: "time"` the server compares **clock time only** — take the time part of the
  value (`HH:mm[:ss]`, or the time of an ISO timestamp) as seconds since midnight and compare
  against the operand parsed the same way; unparseable values never match. In DuckDB:
  `CAST(field AS TIME) >= TIME '09:00:00'` (and `BETWEEN TIME '09:00:00' AND TIME '17:00:00'`).
* `{ "kind": "subquery", "field", "measure", "aggregator", "operator", "value", "value2?" }`
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
{ "rowKey": ["North", "Bikes"], "colKey": ["Q1"], "limit": 500, "query": { /* as above */ } }
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
  "rowFields": ["region", "country"], "colFields": ["category"],
  "rowKey": ["North", "USA"], "colKey": ["Bikes"],
  "field": "revenue", "aggregator": "sum", "value": 500,
  "datasetId": "sales-2026"
}
```

Returns `{ "changed": true, "rowCount": 12345 }`. The server applies the same write-back rule
as the browser: for `sum` the new value is spread across contributing records in proportion to
their current share; for `average` / `min` / `max` / `median` / `first` / `last` / `product`
every contributing record is set to the value; `count` / `distinctCount` are rejected with 422.
Call it from `createBackendClient(...).applyEdit(request)`.

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

* Whitelist field names against the dataset schema before interpolating them into SQL, and
  bind every filter literal as a parameter.
* Apply row-level security server-side too — the client `rowFilter` is a UX convenience, not
  a security boundary.
* Uploaded files land well in DuckDB via `read_csv_auto('…')` / `read_json_auto('…')`, saved
  as a Parquet file keyed by `datasetId`.
* Cache on `(datasetId, query hash)` and return the hash as `meta.queryId`.

---

## 4. Testing

```bash
npx vitest run
```

The suite covers grid rendering and totals, sorting, drill-through, filters, calculated
values, charts, export, localisation, permissions, controlled config, the drag-and-drop
field list, member filters, file upload, and a custom engine adapter (proving the backend
swap works without UI changes).

`src/components/pivot/ui/PivotGrid.test.tsx` covers the Flexmonster-style grid itself:
compact / classic / flat layouts, subtotals and grand totals, expand and collapse,
spreadsheet headers, repeated member labels, cell selection with the auto-calculation
stats, keyboard navigation, clipboard copy, multi-column sorting, column drill and row
windowing; `editing.test.tsx` covers the inline cell editing write-back. Date and time
conditional filters, group-condition (subquery) filters, the report-filter-area toggle and the
chart filter controls are covered in `pivot-core.test.ts`, `PivotStudio.test.tsx` and
`engines/mock-api.test.ts` (the last one over the REST contract). 134 tests in total.

### Backend integration tests (no server required)

`src/components/pivot/engines/backend.test.ts` verifies the REST contract against a mocked
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
import { createMockPivotApi, createBackendEngine, sampleData, sampleFields } from "@/components/pivot";

const api = createMockPivotApi({ rows: sampleData, fields: sampleFields, datasetId: "sales" });
const engine = createBackendEngine({ baseUrl: "https://api.test", datasetId: "sales", fetchImpl: api.fetch });

<PivotStudio data={[]} fields={sampleFields} engine={engine} datasetId="sales" />;
// api.requests -> every request body sent; api.datasets -> server-side rows after edits
```

`src/components/pivot/engines/mock-api.test.ts` runs every grid feature through it: compact /
classic / flat layouts, subtotals and grand totals (including position), row and column drill
(`collapsed` / `collapsedCols`), single and multi-column sorting, server-side filters, paging,
aggregator switching, drill-through, field metadata, member search, dataset upload and inline
cell edits. If your Spring Boot service passes the same assertions, the UI works unchanged.

The mocked tests assert request URLs and methods, JSON bodies (including `datasetId`
injection), auth headers, custom endpoint paths, multipart uploads, `PivotBackendError`
status/message propagation, and hybrid routing (browser-side under the row threshold,
backend above it or whenever a `datasetId` is set). Use them as executable documentation
when implementing the server side.

