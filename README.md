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
| `fields` | `FieldDef[]` | Captions, types, hidden flags (`inferFields()` helps) |
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
  hover highlight, spreadsheet headers, windowed rendering for large results.
* **Filters** — member checkbox filters with search, conditional filters (number/text),
  top/bottom N, report-filter chips above the grid.
* **Field list** — drag-and-drop between Filters / Columns / Rows / Measures (`@dnd-kit`).
* **Aggregations** — sum, count, distinct count, average, median, min, max, product,
  population/sample stdev, percent-of-total; add your own with `registerAggregator()`.
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
  "values": [{ "field": "revenue", "aggregator": "sum", "caption": "Revenue" }],
  "filters": [
    { "kind": "values", "field": "region", "mode": "include", "members": ["North"] },
    { "kind": "condition", "field": "revenue", "operator": "gt", "value": 1000 }
  ],
  "showSubTotals": true,
  "showGrandTotals": true,
  "layout": "compact",
  "collapsed": ["North"],
  "sort": { "by": 0, "direction": "desc" },
  "locale": "en",
  "datasetId": "sales-2026"
}
```

Response (`PivotResult`):

```jsonc
{
  "rowFields": ["region", "category"],
  "colFields": ["quarter"],
  "measure": { "field": "revenue", "caption": "Revenue", "aggregator": "sum" },
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
* `layout: "flat"` means one row per source record combination, no subtotals.

#### `POST /api/pivot/drillthrough`

```jsonc
{ "rowKey": ["North", "Bikes"], "colKey": ["Q1"], "limit": 500, "query": { /* as above */ } }
```

Returns `{ "rows": [ { "region": "North", ... } ] }` — the raw records behind the cell.

#### `POST /api/pivot/datasets` (multipart upload)

`file` part; returns `{ "datasetId": "…", "rowCount": 12345, "fields": [{ "name": "region", "caption": "Region", "type": "string" }] }`.

#### `GET /api/pivot/datasets/{id}/fields`

Returns the same `fields` array so the field list can be built without downloading data.

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
