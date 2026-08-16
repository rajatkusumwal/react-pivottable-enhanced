# Feasibility: full Flexmonster-style grid on react-pivottable with a hybrid DuckDB backend

Short answer: yes, all 26 grid features are still achievable, and moving aggregation to a DuckDB + Spring Boot backend makes the hardest parts (scale, virtualisation, server-side filtering) easier. The catch is that the grid in the browser must now be a **pure display component** fed by an abstract pivot result, with a pluggable adapter layer that can switch between the local react-pivottable engine and the backend cube.

## Implications of the backend shift

With DuckDB doing aggregation:
- **Hard client-side work becomes easier.** Virtual scrolling, 1M+ grouped rows, and server-side filtering become practical because the backend returns a pre-aggregated cell matrix.
- **The frontend owns the interaction layer.** The grid renderer, drag-and-drop field list, toolbars, charts, export, drill-through, and conditional formatting stay in the React component.
- **The frontend no longer owns the math.** Subtotals, grand totals, distinct counts, calculated values, etc. are either produced by the backend or computed locally only for small fallback datasets.
- **Some features need backend cooperation.** Expand/collapse and drill up/down require the backend to expose a query that can group by a chosen subset of levels. Sorting by value, top/bottom N filters, and conditional filters are best done in SQL before the response is sent.
- **Inline editing is out of place.** Writing back to a read-only aggregated query result is not meaningful unless the backend exposes a mapping from aggregated cells to underlying source rows. Treat as out of scope unless the API explicitly supports it.
- **Calculated values can stay client-side.** After the backend returns the base measures, a safe formula parser can combine them. However, if the user wants calculated values to be filterable or sortable, they must be pushed to DuckDB as part of the query.

## Recommended architecture

Introduce a small pivot engine abstraction so the grid never knows which side computed the data.

```text
PivotStudio (React)
├─ Toolbar, FieldList, FilterEditor, etc. (unchanged)
├─ PivotEngine adapter
│   ├─ LocalEngine: react-pivottable PivotData
│   └─ BackendEngine: Spring Boot REST + DuckDB
└─ PivotGrid (React, pure display)
    ├─ compact / classic / flat layouts
    ├─ expand/collapse state
    ├─ selection, copy, keyboard nav
    └─ resize, sort, highlight, totals toggles
```

### Adapter contract

The grid should accept a normalized `PivotResult` shape, not engine-specific data.

```text
PivotResult
├─ rowHeaders: HeaderNode[]
├─ colHeaders: HeaderNode[]
├─ cells: number | string | null[][]
├─ rowTotals: (number | null)[]
├─ colTotals: (number | null)[]
├─ grandTotal: number | null
├─ formats: per-measure format info
└─ metadata: query ID, drill-through keys, etc.
```

Each adapter (local or backend) is responsible for turning its own data into that shape.

### How the backend integration fits

- **Small datasets / offline demo:** keep the existing `react-pivottable` local path so the component still works without the backend.
- **Large datasets / production:** call a Spring Boot REST endpoint that accepts rows, cols, measures, filters, and aggregation, and returns a `PivotResult`.
- **Switching:** a prop or a size threshold decides which adapter to use. The UI does not change; only the data source changes.
- **Backend query contract:** a simple POST body mirroring the `PivotConfig` fields you already have: rows, cols, values, filters, sort, topN, locale, etc. DuckDB can express all of these in SQL.

## Feasibility by feature with the hybrid backend

Easy (backend returns the matrix; frontend is pure display)
- Grid title, show/hide field captions, show/hide spreadsheet headers
- Grand totals / subtotals toggles, per-axis totals, totals top or bottom
- Compact / classic / flat forms
- Repeat member labels in classic form
- Show/hide sorting controls
- Highlight rows/columns on hover and selection
- Column resize, row selection, copy, keyboard navigation
- Auto-calculation bar for selection

Moderate (needs backend API support, but straightforward)
- Expand/collapse and drill up/down multilevel hierarchies
- Sort by value on the pivot table
- Sort multiple columns in flat form
- Virtual grid rendering thousands of rows (windowed renderer over the result matrix)
- Top/bottom N value filters and conditional filters
- Server-side filtering (now in DuckDB SQL)

Hard / out of scope
- Inline editing of aggregated cells unless the backend maps aggregates back to source rows
- OLAP-style slice/dice beyond what the REST API supports
- 1M+ raw rows if the backend is not queried incrementally

## Suggested sequencing

1. Define the `PivotResult` type and the `PivotEngine` adapter interface.
2. Build a pure `PivotGrid` component that only knows how to render `PivotResult` (classic + compact + flat layouts, totals, expand/collapse, selection, sort, resize).
3. Refactor the existing react-pivottable path into a `LocalEngine` adapter that still uses `PivotData` under the hood but produces `PivotResult`.
4. Wire the UI to the adapter, so the toolbar, field list, filters, and export read from `PivotResult` metadata.
5. Add a `BackendEngine` adapter that calls your Spring Boot DuckDB REST API.
6. Add a threshold/hybrid switch so the component picks the backend for large datasets and the local engine for small ones.
7. Layer tests: adapter unit tests, `PivotGrid` rendering tests, and end-to-end integration tests with a mock backend.

## What to do about the demo tabs now

Since the plan is moving toward a backend-powered grid, the current demo page is still useful as a client-side preview. Keep the react-pivottable demo tab but change the Orb.js tab to be informational, or retire it, because the real long-term value is the custom `PivotGrid` that can be backed by either engine. The comparison page should eventually score the custom grid + backend combo as the Flexmonster replacement rather than raw react-pivottable or raw Orb.js.

## Trade-offs

- **More moving parts:** a backend service, REST contract, and adapter layer are now in scope. The frontend component is more complex but more powerful.
- **Performance ceiling rises dramatically:** DuckDB can handle far more data than any browser engine.
- **Feature parity is now a backend + frontend effort:** some features (calculated values, subtotals, top-N) need to be implemented in both SQL and the UI, or you must accept client-side post-processing limitations.
- **The demo becomes less of a "drop-in library" and more of a reference architecture:** integration docs need to explain both the frontend component and the backend API contract.
