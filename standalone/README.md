# inhouse-grid-monster — standalone package

This folder turns `src/components/pivot/` into a self-contained package you can
drop into any React app (Vite, Next.js, CRA, Remix — anything that compiles
TSX).

## 1. Get the source

From the repo root:

```bash
node standalone/scripts/sync-from-app.mjs
```

That copies `src/components/pivot/` into `standalone/src/pivot/` and removes the
`*.test.ts(x)` files. `standalone/src/pivot/` is generated, so it is gitignored —
run the sync again after changing the component.

## 2. Dependencies the target project needs

Runtime packages (nothing else from this repo is required):

```bash
npm i react react-dom @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react recharts
```

| Package                                             | Used for                             |
| --------------------------------------------------- | ------------------------------------ |
| `react`, `react-dom` (18.2+ or 19)                  | the component itself                 |
| `@dnd-kit/core`, `/sortable`, `/utilities`          | drag & drop of fields between areas  |
| `lucide-react`                                      | toolbar and grid icons               |
| `recharts`                                          | the pivot charts tab                 |

Build-time requirements:

- **TypeScript 5+** with `"jsx": "react-jsx"` (or strip the types if your app is JS).
- **Tailwind CSS** — the components are styled entirely with Tailwind utility
  classes. Tailwind v4 is what the demo uses; v3 works if you define the same
  semantic colour names.
- **A CSS pipeline** that scans the pivot files, so the classes are not purged.

Explicitly **not** needed: any router, `@tanstack/*`, shadcn/ui, Radix,
`clsx`/`tailwind-merge`, or a backend. Aggregation runs in the browser unless
you pass a different engine.

## 3. Theme tokens

The classes reference semantic tokens (`bg-card`, `text-muted-foreground`,
`border-border`, `bg-surface`, `text-primary`, …). Import the bundled token file
once, after Tailwind:

```css
/* app.css */
@import "tailwindcss";
@import "inhouse-grid-monster/styles.css"; /* or: @import "./pivot-theme.css"; */
```

On Tailwind v3, copy the `:root` variables from `src/pivot-theme.css` into your
global CSS and map them in `tailwind.config.js`:

```js
// tailwind.config.js
export default {
  content: ["./src/**/*.{ts,tsx}"], // must include the copied pivot folder
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

## 4. Two ways to consume it

### A. Copy the folder (simplest, recommended)

1. Run the sync script.
2. Copy `standalone/src/pivot/` into your app, e.g. `src/pivot/`.
3. Copy `standalone/src/pivot-theme.css` next to your global CSS and import it.
4. Use it:

```tsx
import { PivotStudio, sampleData, sampleFields } from "./pivot";

export function Reports() {
  return <PivotStudio data={sampleData} fields={sampleFields} />;
}
```

There is no path-alias magic — every import inside the folder is relative, so it
works wherever you put it.

### B. Build it as a package

```bash
cd standalone
npm install
npm run sync
npm run build      # -> dist/index.js + dist/index.d.ts
npm pack           # or: npm publish --registry <your registry>
```

Then in the host app:

```tsx
import { PivotStudio } from "inhouse-grid-monster";
import "inhouse-grid-monster/styles.css";
```

React and the five runtime deps stay external, so the host app keeps one copy of
each.

## 5. Server-side rendering

`PivotStudio` is a client component: it reads `window`/`sessionStorage` and uses
drag & drop. In Next.js App Router add `"use client"` at the top of the file that
renders it (or load it with `next/dynamic` and `{ ssr: false }`).

## 6. Backend aggregation

Nothing above changes if you move aggregation to a server: pass an engine.

```tsx
import { PivotStudio, createBackendEngine } from "./pivot";

const engine = createBackendEngine({ baseUrl: "https://api.example.com/pivot" });

<PivotStudio fields={fields} engine={engine} />;
```

The REST contract (request/response shapes, drill-through, paging) is documented
in the root `README.md`.
