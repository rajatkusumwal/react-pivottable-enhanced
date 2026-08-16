# Pivot Studio

A drop-in React pivot table UI that layers Flexmonster-style features on top of the two
open-source engines: **react-pivottable** and the headless **orb.js** (`orb.pgrid`) engine.

Live demos: `/demos` (one tab per engine). Feature comparison vs Flexmonster: `/`.

## Install

```bash
npm i react-pivottable orb recharts
```

Copy `src/components/pivot/` into your app (it has no project-specific imports beyond
Tailwind classes), then:

```tsx
import { PivotStudio, sampleData, sampleFields } from "@/components/pivot";

export default function Page() {
  return (
    <PivotStudio
      engine="react-pivottable"   // or "orb"
      data={sampleData}
      fields={sampleFields}
      title="Sales analysis"
    />
  );
}
```

Vite users: orb's UMD bundle references Node's `global`, so add to `vite.config.ts`:

```ts
define: { global: "globalThis" }
```

## Props

| Prop | Type | Notes |
| --- | --- | --- |
| `data` | `PivotRow[]` | Flat records to analyse |
| `fields` | `FieldDef[]` | Metadata; use `inferFields(rows)` to generate |
| `engine` | `"react-pivottable" \| "orb"` | Grid renderer |
| `initialConfig` | `Partial<PivotConfig>` | Uncontrolled starting state |
| `config` / `onConfigChange` | `PivotConfig` | Fully controlled mode |
| `permissions` | `Permissions` | Export / drill-through / edit / field masking |
| `showSidebar`, `showToolbar` | `boolean` | Hide chrome if the host app supplies its own |
| `title`, `className` | `string` | Presentation |

## Feature map

- **Grid** — compact/classic/flat layouts, totals & grand totals, expand/collapse, sorting,
  conditional formatting, number formats.
- **Filters** — value (member) filters, conditional filters, top-N, report filters.
- **Field list** — drag-free select-to-area sidebar, rows/columns/values/filters, reordering.
- **Aggregations** — sum, count, distinct count, average, median, min, max, product, stdev,
  variance, percent of total; register your own with `registerAggregator`.
- **Calculated values** — safe formula parser (`evaluateFormula`, `validateFormula`) with
  `+ - * / ()` and field references.
- **Charts** — column, bar, line, area, pie, scatter via Recharts, driven by `buildChartData`.
- **Drill-through** — click any cell to see the underlying records (`drillThroughRows`).
- **Toolbar & UI** — save/load report JSON, layout switch, chart switch, locale switch, print.
- **Export & print** — CSV, TSV, HTML, JSON, Excel (`.xls`), clipboard copy, print view.
- **Options & localisation** — bundled locales (`locales`, `getLocale`), locale-aware number
  and percent formatting.
- **Data sources** — inline JSON, CSV string/file/URL, remote JSON (`parseCsv`, `loadCsvUrl`,
  `loadJsonUrl`, `readFileAsRows`) with automatic type inference.
- **Customization & style** — `PivotTheme` tokens plus `className` overrides; all sub-components
  (`PivotToolbar`, `PivotSidebar`, `PivotChart`, `DrillThroughDialog`) are exported for reuse.
- **Security & authentication** — `secureRows` (row-level security predicates), field masking,
  and `can()` permission checks that hide export/drill-through/edit actions.

## Composing your own shell

Every layer is exported independently, so you can use the shared feature core with your own UI:

```tsx
import { applyFilters, applyCalculatedFields, aggregate, exportMatrix } from "@/components/pivot";
```

## Tests

```bash
npx vitest run
```

30 tests cover the aggregation registry, formula parser, filters, security, export helpers,
and full integration flows for both engines (render, drill-through, filtering, calculated
values, charts, localisation, export, permissions, controlled config).
