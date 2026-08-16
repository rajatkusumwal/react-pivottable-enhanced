# Feasibility: full Flexmonster-style grid on react-pivottable

Short answer: yes, essentially all of the 26 grid features are achievable — but not with react-pivottable's built-in table renderer. The realistic path is to keep react-pivottable as the **calculation engine** (its `PivotData` class, which we already feed with our aggregators) and replace its renderer with our **own grid component**. Once we own the renderer, every grid row in the comparison table is in reach except true server-side scale.

## Feasibility by feature

Easy (renderer we control, small work)
- Grid title, show/hide field captions, show/hide spreadsheet headers
- Grand totals / subtotals toggles, per-axis grand totals, totals top or bottom
- Repeat member labels in classic form
- Show/hide sorting controls, sort field members, sort values by a column
- Highlight rows/columns on hover and on selection
- Enable/disable drag and drop

Moderate (real but well-understood work)
- Compact form (indented row hierarchy) and flat form — needs our own layout pass over PivotData keys
- Expand/collapse members and drill up/down multilevel hierarchies — needs an expansion-state model driving which key depths render
- Subtotal rows per level (PivotData gives us the tree; we render partial aggregates)
- Column/row resizing with persisted widths
- Cell selection (click, shift-click, ctrl-click), copy to clipboard, keyboard navigation
- Auto-calculation bar (sum/avg/count of selection) — trivial once selection exists
- Multi-column sort in flat form

Hard / partial
- Virtual scrolling for large data: doable with a windowed renderer, but react-pivottable's PivotData aggregates the whole dataset in memory up front. Comfortable up to roughly 100k–200k source rows in the browser; 1M+ grouped rows like Flexmonster needs a server-side aggregation layer, not a renderer change.
- Inline cell editing: technically possible (write back to source rows and re-aggregate) but only meaningful with a data source that can persist edits.
- Server-side / OLAP grid modes: out of scope for a client-only engine.

## Recommended approach

1. Stop rendering through `react-pivottable/PivotTable` + `TableRenderers`. Import `PivotData` directly and build `PivotGrid` in `src/components/pivot/grid/`.
2. Derive a row/column header tree from PivotData keys, with per-level subtotal nodes and an expansion state map.
3. Render three layouts from that same tree: compact, classic, flat.
4. Layer interaction concerns as separate hooks so they stay testable: selection + clipboard, keyboard nav, column resize, sort state, hover highlight.
5. Add windowed rendering (only visible row range) behind a threshold so small reports keep plain rendering.
6. Keep the existing toolbar, field list dialog, filters, calculated values, charts, export and security untouched — they already sit above the engine.

## Trade-offs to be aware of

- We take ownership of the grid. react-pivottable then contributes aggregation only, so upstream renderer bugs stop mattering, but so do upstream renderer improvements.
- The existing drag-and-drop, export and drill-through code reads the rendered table in a couple of places; those would switch to reading the grid model instead, which is cleaner but touches those modules.
- Effort is real: this is the largest single piece of the Flexmonster-parity work, roughly the same size as everything already built around the engine.

## Suggested sequencing

1. `PivotGrid` skeleton with classic layout + totals toggles (replaces current renderer, parity check).
2. Compact layout, subtotals, expand/collapse.
3. Selection, copy, keyboard nav, calculation bar.
4. Sorting controls, resize, repeat labels, flat multi-sort.
5. Virtualisation.

Each stage keeps the demo working and adds tests next to the existing suites.
