# inhouse-grid-monster

A Flexmonster-style pivot table for React: drag & drop fields, filters,
calculated values, subtotals, charts, drill-through, export and inline editing.
Aggregation runs in the browser by default and can be moved to a backend
service by passing a different engine.

## Install

```bash
npm i inhouse-grid-monster
```

That pulls in the only runtime deps: `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `lucide-react` and `recharts`. `react` and `react-dom`
(18.2+ or 19) stay peer dependencies, so the host app keeps one copy.

Not needed: a router, shadcn/ui, Radix, `clsx`, `tailwind-merge`, or a backend.

## Use it

```tsx
import { PivotStudio, sampleData, sampleFields } from "inhouse-grid-monster";
import "inhouse-grid-monster/styles.css";

export function Reports() {
  return <PivotStudio data={sampleData} fields={sampleFields} />;
}
```

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
override any of them in your own CSS to re-skin the grid.

## Props

| Prop                          | Type                     | Default    | What it does                                     |
| ----------------------------- | ------------------------ | ---------- | ------------------------------------------------ |
| `data`                        | `PivotRow[]`             | —          | Records to analyse (local engine)                |
| `fields`                      | `FieldDef[]`             | —          | Field metadata; `inferFields(rows)` can build it |
| `initialConfig`               | `Partial<PivotConfig>`   | —          | Starting report (uncontrolled)                   |
| `config` / `onConfigChange`   | `PivotConfig` / callback | —          | Fully controlled report state                    |
| `engine`                      | `PivotEngineAdapter`     | local      | Swap in backend aggregation                      |
| `fieldsUi`                    | `"dialog" \| "sidebar"`  | `"dialog"` | Flexmonster popup field list, or a docked panel  |
| `showToolbar` / `showSidebar` | `boolean`                | `true`     | Hide chrome when the host supplies its own       |
| `allowFileUpload`             | `boolean`                | `true`     | Show the CSV/JSON drop bar                       |
| `permissions`                 | `Permissions`            | all on     | Turn off export, drill-through, editing, …       |
| `onDataChange`                | `(rows) => void`         | —          | Inline cell edits written back                   |
| `title`, `className`          | `string`                 | —          | Header text and wrapper class                    |

## Backend aggregation

```tsx
import { PivotStudio, createBackendEngine } from "inhouse-grid-monster";

const engine = createBackendEngine({ baseUrl: "https://api.example.com/pivot" });

<PivotStudio fields={fields} data={[]} engine={engine} />;
```

Every engine returns the same `PivotResult`, so the browser engine and a service
(e.g. Spring Boot + DuckDB) stay swappable. `createMockPivotApi()` implements the
REST contract in-memory for tests. The request/response shapes are documented in
the repo root `README.md`.

## Server-side rendering

`PivotStudio` is a client component (it reads `window`/`sessionStorage` and uses
drag & drop). In Next.js App Router add `"use client"` to the file that renders
it, or load it with `next/dynamic` and `{ ssr: false }`.

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
