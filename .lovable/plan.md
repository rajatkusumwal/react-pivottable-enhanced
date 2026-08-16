# Pivot Library Comparison Page

A single comparison page that lists Flexmonster's feature set down the left (Y axis) and compares it column-by-column against two open-source alternatives: react-pivottable and Orb.js.

## What gets built

Replace the placeholder home page (`/`) with a comparison matrix page.

**Layout**
- Header: title, one-line intro, last-reviewed note, and links to each product's site.
- Sticky comparison table:
  - Y axis (rows): Flexmonster feature names, grouped into collapsible/labelled category sections.
  - X axis (columns): Flexmonster | react-pivottable | Orb.js.
  - Cells: support status — full, partial, or none — rendered as an icon plus short qualifier text where "partial" needs explanation (e.g. "via plugin", "chart only").
- Sticky first column and sticky header row so the feature name and product stay visible while scrolling a long matrix.
- Category filter chips and a text search box to narrow the visible rows.
- A "differences only" toggle that hides rows where all three products behave the same.
- Summary cards above the table: total features supported per product, and a short verdict paragraph for each library (licensing, maintenance status, best fit).
- Mobile: the table collapses into stacked per-feature cards showing the three verdicts.

**Feature categories on the Y axis** (from Flexmonster's technical specifications)
Grid, Filters, Field List, Aggregation functions, Calculated values, Pivot charts, Drill-through, Toolbar & UI, Export & print, Options & localisation, Data sources, Customization & styling, Security & authentication, Framework integrations, Developer API & support, Licensing & cost.

Roughly 120-150 individual feature rows across those groups, covering the full Flexmonster spec list rather than a highlights subset.

**Comparison accuracy**
- Flexmonster column: sourced from the official technical-specifications matrix.
- react-pivottable: supports drag-and-drop pivot UI, aggregators, sorting, table/heatmap renderers, and Plotly chart renderers via an add-on; no export, no toolbar, no server-side data sources, no drill-through, no conditional formatting.
- Orb.js: pivot grid with drag-and-drop, subtotals/grand totals, expand/collapse, sorting, filtering, basic themes, and Excel export via a plugin; no charts, no calculated fields UI, no server-side sources; project is unmaintained.
- Each non-supported/partial claim gets a short qualifier so the table is defensible rather than a wall of red X marks.
- A footnote line records the source pages used and the date the comparison was compiled.

## Technical notes

- Feature matrix lives in a typed data module (`src/lib/pivot-comparison.ts`) exporting categories and rows with `flexmonster | reactPivottable | orb` support values (`"yes" | "partial" | "no"`) plus optional per-cell notes. The route renders from that data, so rows can be edited without touching layout code.
- Page implemented in `src/routes/index.tsx` with `head()` metadata: unique title, description, og:title, og:description, og:type, twitter:card.
- Search/filter/differences-only are local component state; no backend needed.
- Styling uses the existing semantic design tokens in `src/styles.css`; support states get dedicated token-based colours (supported / partial / unsupported) added to the theme rather than hardcoded utility colours.
- Semantic HTML: single `<h1>`, real `<table>` with `<caption>`, `<th scope="row">` for feature names and `<th scope="col">` for products, so the matrix is screen-reader navigable.
