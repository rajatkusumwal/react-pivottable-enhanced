# react-pivottable-enhanced-angular

Angular wrapper for [`react-pivottable-enhanced`](https://github.com/rajatkusumwal/react-pivottable-enhanced) —
a commercial-style pivot table with drag & drop fields, filters, calculated values,
charts, drill-through, export, inline editing and backend aggregation.

The pivot table itself is written in React. This package is a thin `<pivot-studio>`
Angular component that mounts it, maps every input onto a React prop and re-emits the
React callbacks as Angular outputs. **No pivot logic lives here**, so Angular and React
apps always get exactly the same features and the same bug fixes.

- Source code: [github.com/rajatkusumwal/react-pivottable-enhanced](https://github.com/rajatkusumwal/react-pivottable-enhanced)
- Issues: [github.com/rajatkusumwal/react-pivottable-enhanced/issues](https://github.com/rajatkusumwal/react-pivottable-enhanced/issues)
- Contributing: [CONTRIBUTING.md](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/CONTRIBUTING.md)
- React reference manual: [standalone/README.md](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/standalone/README.md)

## Contents

1. [What you get](#what-you-get)
2. [For AI coding agents](#for-ai-coding-agents)
3. [Install](#install)
4. [Hello pivot](#hello-pivot)
5. [How the wrapper works](#how-the-wrapper-works)
6. [Inputs](#inputs)
7. [Outputs](#outputs)
8. [The report config](#the-report-config)
9. [Recipes](#recipes) — 12 copy-paste samples
10. [Backend aggregation](#backend-aggregation)
11. [Testing your integration](#testing-your-integration)
12. [Server-side rendering (Angular Universal)](#server-side-rendering-angular-universal)
13. [API reference](#api-reference)
14. [Performance notes](#performance-notes)
15. [Troubleshooting](#troubleshooting)
16. [Building and publishing](#building-and-publishing)

## What you get

Every capability of the React package is available from Angular, because the same
component renders in both. Summary:

**Grid** — compact / classic / flat layouts, virtualised rows, subtotals and grand
totals (top or bottom), expand/collapse and multilevel drill up/down, member and
value sorting, shift-click multi-column sort in flat tables, drag & drop of fields,
resizing, cell selection with a summary bar, keyboard navigation, inline editing.

**Filters** — member checkbox filters with search, conditional filters (string,
number, date, time), top/bottom N, a report (page) filter area, chart-level filters,
filters pushed to the backend as subqueries.

**Field list** — dockable panel or dialog, search, folders, hierarchies, multiple
fields per axis, the same field aggregated twice, UI for calculated values.

**Aggregation** — sum, count, distinct count, average, median, product, min, max,
population/sample standard deviation, display modes (% of total / row / column /
parent, index, difference, running totals) and custom aggregators.

**Charts** — column, bar, line, scatter, pie, stacked column, combined column+line,
heatmap, split view, click-to-filter and chart drill-down.

**Drill-through** — dialog from any cell or chart point, column selection, sorting,
row limits, export of the drill-through view.

**Toolbar, export and options** — save/open a report, share by link, conditional and
number formatting UI, fullscreen, context menu, Excel/CSV/TSV/HTML/JSON export, print
with custom headers and footers, localisation, permissions and row-level security.

The authoritative, itemised list lives in the
[React package README](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/standalone/README.md#feature-list).

## For AI coding agents

Read this section first; it is enough to integrate the package correctly without
opening any other file.

**Quick facts**

| Key             | Value                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| Package         | `react-pivottable-enhanced-angular`                                                  |
| Selector        | `<pivot-studio>` (standalone component `PivotStudioComponent`; no default export)    |
| NgModule        | `PivotStudioModule` for non-standalone apps                                          |
| Styles          | `react-pivottable-enhanced/dist/pivot-theme.css` — required, added once              |
| Peers           | `@angular/core`, `@angular/common` (16–21), `react`, `react-dom`, the React package  |
| Rendering       | Browser only — guard with `isPlatformBrowser` under Angular Universal                |
| Data shape      | `Array<Record<string, string \| number \| null>>` (flat rows, one object per record) |
| Change strategy | `OnPush`; React owns the DOM inside the host element                                 |

**Minimum viable integration** (copy verbatim, then change the data):

```ts
import { Component } from "@angular/core";
import {
  PivotStudioComponent,
  inferFields,
  type PivotRow,
} from "react-pivottable-enhanced-angular";

@Component({
  standalone: true,
  selector: "app-reports",
  imports: [PivotStudioComponent],
  template: `<pivot-studio
    [data]="rows"
    [fields]="fields"
    [initialConfig]="{
      rows: ['region'],
      cols: ['year'],
      values: [{ field: 'revenue', aggregator: 'sum' }],
    }"
  ></pivot-studio>`,
})
export class ReportsComponent {
  rows: PivotRow[] = []; // your records
  fields = inferFields(this.rows);
}
```

**Rules — violating these causes almost every failed integration**

1. Import from `react-pivottable-enhanced-angular` (named exports only). Types and
   helpers are re-exported from there, so apps import from one place.
2. Add the theme stylesheet once (`angular.json` `styles` array or `styles.css`), or
   the grid renders unstyled.
3. A report needs at least one entry in `values`, otherwise the grid is empty.
4. Field names in `rows`, `cols`, `values` and filters must match keys in the data
   records exactly (case-sensitive).
5. Keep `data` referentially stable — assign a new array only when the data really
   changed. Rebuilding it in a getter or template expression re-aggregates on every
   change-detection pass.
6. Do not render under Angular Universal without an `isPlatformBrowser` guard.
7. Keep exactly one copy of `react` / `react-dom` in the app (`npm dedupe`), or React
   throws "Invalid hook call".
8. Above ~100k rows, use `createBackendEngine` instead of shipping rows to the browser.

**Task → API map**

| Task                            | Use                                                        |
| ------------------------------- | ---------------------------------------------------------- |
| Build field metadata from rows  | `inferFields(rows)`                                        |
| Set a starting report           | `[initialConfig]`                                          |
| Control the report from Angular | `[config]` + `(configChange)`                              |
| Persist a report                | `(configChange)` → your store / `localStorage`             |
| Aggregate on a server           | `[engine]="createBackendEngine({ baseUrl })"` + `datasetId` |
| Fake a backend in tests         | `createMockPivotApi()` (React package)                     |
| React to inline edits           | `(dataChange)`                                             |
| Restrict what a user may do     | `[permissions]`                                            |
| Docked field panel vs dialog    | `[fieldsUi]="'sidebar'"` / `'dialog'`                      |
| Mount outside Angular DI        | `createPivotMount(hostElement)`                            |

## Install

```bash
npm i react-pivottable-enhanced-angular react-pivottable-enhanced react react-dom
```

Angular 16 – 21 is supported. `react`, `react-dom`, `@angular/core` and
`@angular/common` are peer dependencies, so your app owns the versions.

Add the theme stylesheet once — in `angular.json`:

```json
"styles": [
  "node_modules/react-pivottable-enhanced/dist/pivot-theme.css",
  "src/styles.css"
]
```

or in `src/styles.css`:

```css
@import "react-pivottable-enhanced/styles.css";
```

Tailwind is **not** required: the stylesheet ships the compiled utilities the grid
uses. If your app already runs Tailwind v4, add the library to your content scan
instead:

```css
@source "../node_modules/react-pivottable-enhanced/dist";
```

## Hello pivot

```ts
import { Component } from "@angular/core";
import {
  PivotStudioComponent,
  sampleData,
  sampleFields,
  type PivotConfig,
} from "react-pivottable-enhanced-angular";

@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  selector: "app-reports",
  template: `
    <div style="height: 720px">
      <pivot-studio
        [data]="data"
        [fields]="fields"
        title="Sales report"
        (configChange)="saveLayout($event)"
      ></pivot-studio>
    </div>
  `,
})
export class ReportsComponent {
  data = sampleData;
  fields = sampleFields;
  saveLayout(config: PivotConfig) {
    localStorage.setItem("pivot-layout", JSON.stringify(config));
  }
}
```

Give the host a height (or let it sit in a flex column) — the grid fills the space it
is given.

Not on standalone components yet? Import the NgModule instead:

```ts
import { NgModule } from "@angular/core";
import { PivotStudioModule } from "react-pivottable-enhanced-angular";

@NgModule({ imports: [PivotStudioModule] })
export class ReportsModule {}
```

## How the wrapper works

Useful when debugging; you never have to call any of this yourself.

```text
<pivot-studio>            Angular component (OnPush, empty template)
   ngOnInit    → zone.runOutsideAngular(() => createPivotMount(host).render(props))
   ngOnChanges → mount.render(nextProps)      // React reconciles, Angular stays out
   ngOnDestroy → mount.destroy()              // React root unmounted, no leaks
   outputs     → zone.run(() => emitter.emit(payload))   // change detection runs
```

- React renders **inside** the component's host element; Angular never touches that
  subtree, which is why `ChangeDetectionStrategy.OnPush` is safe.
- React work runs outside the Angular zone, so pivot re-renders do not trigger
  application-wide change detection.
- Outputs are re-entered into the zone, so `(configChange)`/`(dataChange)` handlers
  behave like any other Angular event.
- A `render()` scheduled after `destroy()` is a no-op, so teardown never crashes.

## Inputs

| Input               | Type                    | Default         | What it does                                             |
| ------------------- | ----------------------- | --------------- | -------------------------------------------------------- |
| `data`              | `PivotRow[]`            | `[]`            | Records to analyse (used by the local engine)            |
| `fields`            | `FieldDef[]`            | `[]`            | Field metadata; use `inferFields(data)` if you have none |
| `engine`            | `PivotEngineAdapter`    | local engine    | Swap browser aggregation for a backend service           |
| `initialConfig`     | `Partial<PivotConfig>`  | —               | Starting layout (uncontrolled)                           |
| `config`            | `PivotConfig`           | —               | Fully controlled layout; pair with `(configChange)`      |
| `permissions`       | `Permissions`           | all allowed     | Turn off edit / export / drill-through                   |
| `title`             | `string`                | `"Pivot table"` | Accessible name of the pivot region                      |
| `className`         | `string`                | `""`            | Extra classes on the wrapper                             |
| `showSidebar`       | `boolean`               | `true`          | Show the docked field panel                              |
| `showToolbar`       | `boolean`               | `true`          | Show the toolbar                                         |
| `allowFileUpload`   | `boolean`               | `false`         | Show the "import your own file" bar                      |
| `onUploadToBackend` | `UploadHandler`         | —               | Send uploads to your service instead of memory           |
| `datasetId`         | `string`                | —               | Dataset handle for backend queries                       |
| `fieldsUi`          | `"dialog" \| "sidebar"` | `"dialog"`      | Field bar + popup, or docked panel                       |

`UploadHandler` is
`(file: File) => Promise<{ datasetId: string; rowCount: number; fields: FieldDef[] }>`.

## Outputs

| Output         | Payload       | Fires when                                                   |
| -------------- | ------------- | ------------------------------------------------------------ |
| `configChange` | `PivotConfig` | The report layout changes (drag & drop, sorting, filters, …) |
| `dataChange`   | `PivotRow[]`  | Inline editing writes new values back into the records       |

Both are emitted inside the Angular zone, so change detection runs as usual.

## The report config

`PivotConfig` is a plain JSON object — the whole report state. Store it, diff it, ship
it to a server, restore it later.

```ts
const config: PivotConfig = {
  rows: ["region", "city"], // row fields, outer → inner
  cols: ["year"], // column fields
  values: [{ field: "revenue", aggregator: "sum", format: { type: "currency" } }],
  filters: [{ field: "channel", type: "members", include: ["Online"] }],
  layout: "compact", // "compact" | "classic" | "flat"
  showRowTotals: true,
  showColTotals: true,
  sort: { field: "revenue", direction: "desc" },
};
```

Field metadata tells the pivot what a column *is*:

```ts
const fields: FieldDef[] = [
  { name: "region", type: "string", caption: "Region" },
  { name: "orderDate", type: "date" },
  { name: "revenue", type: "number", format: { type: "currency", currency: "USD" } },
];
```

Use `inferFields(rows)` to derive this automatically, then override only what you care
about. The full shape of `PivotConfig`, `FieldDef`, filters, formats and calculated
values is documented in the
[React README](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/standalone/README.md#the-report-config)
— the objects are identical in Angular.

## Recipes

### 1. Load data from an HTTP service

```ts
@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  template: `<pivot-studio [data]="rows" [fields]="fields"></pivot-studio>`,
})
export class ReportsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  rows: PivotRow[] = [];
  fields: FieldDef[] = [];

  ngOnInit() {
    this.http.get<PivotRow[]>("/api/sales").subscribe((rows) => {
      this.rows = rows; // one new array reference per real change
      this.fields = inferFields(rows);
    });
  }
}
```

With an observable and the `async` pipe, keep the reference stable via `shareReplay(1)`
so the template does not resubscribe.

### 2. Controlled report state (save & restore)

```ts
export class ControlledComponent {
  config: PivotConfig = JSON.parse(localStorage.getItem("pivot") ?? "null") ?? {
    rows: ["region"],
    cols: [],
    values: [{ field: "revenue", aggregator: "sum" }],
  };

  onConfig(next: PivotConfig) {
    this.config = next;
    localStorage.setItem("pivot", JSON.stringify(next));
  }
}
```

```html
<pivot-studio
  [data]="data"
  [fields]="fields"
  [config]="config"
  (configChange)="onConfig($event)"
></pivot-studio>
```

Use `[config]` **or** `[initialConfig]`, never both: `[config]` means Angular owns the
state and must feed every change back.

### 3. Preset reports (buttons that swap the layout)

```ts
presets: Record<string, PivotConfig> = {
  byRegion: { rows: ["region"], cols: [], values: [{ field: "revenue", aggregator: "sum" }] },
  byYear: { rows: ["year"], cols: ["channel"], values: [{ field: "units", aggregator: "sum" }] },
};
config = this.presets["byRegion"]!;
apply(name: string) { this.config = this.presets[name]!; }
```

### 4. Measures and number formats

```ts
config: PivotConfig = {
  rows: ["region"],
  cols: [],
  values: [
    { field: "revenue", aggregator: "sum", format: { type: "currency", currency: "EUR" } },
    { field: "revenue", aggregator: "average", caption: "Avg deal" },
    { field: "orderId", aggregator: "distinctCount", caption: "Orders" },
    { field: "revenue", aggregator: "sum", displayMode: "percentOfColumn", caption: "Share" },
  ],
};
```

### 5. Filters

```ts
config: PivotConfig = {
  rows: ["region"],
  cols: [],
  values: [{ field: "revenue", aggregator: "sum" }],
  filters: [
    { field: "channel", type: "members", include: ["Online", "Retail"] },
    { field: "revenue", type: "condition", operator: "greaterThan", value: 1000 },
    { field: "region", type: "topN", measure: "revenue", direction: "top", count: 5 },
  ],
};
```

### 6. Charts and split view

```ts
config: PivotConfig = {
  rows: ["region"],
  cols: ["year"],
  values: [{ field: "revenue", aggregator: "sum" }],
  view: "split", // "grid" | "chart" | "split"
  chart: { type: "stackedColumn", showLegend: true, title: "Revenue by region" },
};
```

### 7. Inline editing with write-back

```html
<pivot-studio [data]="rows" [fields]="fields" (dataChange)="persist($event)"></pivot-studio>
```

```ts
persist(rows: PivotRow[]) {
  this.rows = rows;
  this.http.put("/api/sales", rows).subscribe();
}
```

Editing a total spreads the change proportionally over the contributing records.

### 8. Permissions and read-only mode

```ts
permissions: Permissions = {
  canEdit: false,
  canExport: true,
  canDrillThrough: false,
};
```

```html
<pivot-studio [data]="rows" [fields]="fields" [permissions]="permissions"></pivot-studio>
```

### 9. Docked field panel instead of the dialog

```html
<pivot-studio [fieldsUi]="'sidebar'" [showSidebar]="true" [data]="rows" [fields]="fields">
</pivot-studio>
```

### 10. Let users import their own CSV/JSON

```html
<pivot-studio [allowFileUpload]="true" [data]="rows" [fields]="fields"></pivot-studio>
```

To push uploads to your service instead of keeping them in memory:

```ts
upload: UploadHandler = async (file) => {
  const body = new FormData();
  body.append("file", file);
  return await firstValueFrom(
    this.http.post<{ datasetId: string; rowCount: number; fields: FieldDef[] }>(
      "/api/pivot/upload",
      body,
    ),
  );
};
```

```html
<pivot-studio [allowFileUpload]="true" [onUploadToBackend]="upload"></pivot-studio>
```

### 11. Lazy-load the pivot route

React and the charting library are the bulk of the bundle. Keep them out of the initial
chunk with a lazy route:

```ts
export const routes: Routes = [
  {
    path: "reports",
    loadComponent: () => import("./reports.component").then((m) => m.ReportsComponent),
  },
];
```

### 12. Mount it outside Angular's component lifecycle

```ts
import { createPivotMount } from "react-pivottable-enhanced-angular";

const mount = createPivotMount(hostEl);
mount.render({ data, fields, title: "Ad-hoc" });
mount.alive; // true
mount.destroy();
```

Useful inside a directive, a dialog service or an AngularJS hybrid shell.

## Backend aggregation

Point the pivot at your own service (for example Spring Boot + DuckDB). The pivot then
sends the report definition and renders whatever the service returns, so browser memory
stops being the limit.

```ts
import { createBackendEngine } from "react-pivottable-enhanced-angular";

export class ReportsComponent {
  engine = createBackendEngine({ baseUrl: "/api/pivot" });
  datasetId = "sales-2026";
  fields: FieldDef[] = []; // load from /api/pivot/datasets/sales-2026/fields
}
```

```html
<pivot-studio
  [engine]="engine"
  [datasetId]="datasetId"
  [data]="[]"
  [fields]="fields"
></pivot-studio>
```

Endpoints, request/response payloads and the drill-through contract are specified in the
[React README](https://github.com/rajatkusumwal/react-pivottable-enhanced/blob/main/standalone/README.md#backend-aggregation).
The engine is framework-agnostic; nothing about it changes in Angular.

## Testing your integration

The wrapper is driven exactly like any other Angular component. React needs a tick to
paint, so wait for a selector instead of asserting synchronously.

```ts
import "@angular/compiler";
import "zone.js";
import "zone.js/testing";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import { PivotStudioComponent, sampleData, sampleFields } from "react-pivottable-enhanced-angular";

@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  template: `<pivot-studio [data]="data" [fields]="fields" title="Sales"></pivot-studio>`,
})
class HostComponent {
  data = sampleData;
  fields = sampleFields;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

async function waitFor(el: HTMLElement, selector: string) {
  for (let i = 0; i < 50; i += 1) {
    const found = el.querySelector(selector);
    if (found) return found;
    await flush();
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
});

it("renders the grid", async () => {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  expect(await waitFor(host, "table")).toBeTruthy();
  fixture.destroy(); // React unmounts with the component
});
```

Notes:

- Run these in a DOM environment (`jsdom` or `happy-dom` in Vitest/Jest, or Karma).
- Assert `(configChange)` payloads rather than DOM internals — the layout JSON is the
  stable contract.
- For backend engines use `createMockPivotApi()` from the React package; it implements
  the REST contract in memory, so no server is needed.
- The wrapper's own suite (`angular/src/*.test.ts`) covers mounting, input updates,
  teardown, zone-correct outputs and the NgModule path; run it with `bun run test`.

## Server-side rendering (Angular Universal)

The pivot renders in the browser only (it reads `window` and uses drag & drop). Guard
the component:

```html
@if (isBrowser) {
<pivot-studio [data]="data" [fields]="fields"></pivot-studio>
}
```

```ts
isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
```

Older template syntax: `<pivot-studio *ngIf="isBrowser" ...>`.

## API reference

All exports are named; there is no default export.

**Component and module**

- `PivotStudioComponent` — the standalone `<pivot-studio>` component
- `PivotStudioModule` — NgModule wrapper for non-standalone apps

**Mounting glue**

- `createPivotMount(host: HTMLElement): PivotMount` — `{ render(props), destroy(), alive }`

**Re-exported from `react-pivottable-enhanced`**

- Helpers: `inferFields`, `createLocalEngine`, `createBackendEngine`, `sampleData`,
  `sampleFields`
- Types: `PivotRow`, `FieldDef`, `PivotConfig`, `PivotResult`, `PivotEngineAdapter`,
  `Permissions`, `UploadHandler`

Anything not re-exported (custom aggregators, export helpers, localisation packs,
`createMockPivotApi`) can be imported directly from `react-pivottable-enhanced`, which is
already a dependency of your app.

## Performance notes

- **Bundle** — this route ships React + ReactDOM (~50–150 KB gzipped) plus the charting
  library. Lazy-load the pivot route (recipe 11) so other pages are unaffected.
- **Change detection** — React work runs outside the Angular zone; the pivot never
  triggers app-wide change detection on its own.
- **Input identity** — `ngOnChanges` re-renders React whenever any input reference
  changes. Do not build `[data]` or `[config]` objects inline in the template.
- **Dataset size** — the local engine handles tens of thousands of rows comfortably.
  Beyond ~100k rows, switch to `createBackendEngine`.

## Troubleshooting

- **"Invalid hook call" / two Reacts** — your app has more than one copy of `react`.
  Deduplicate it (`npm dedupe`) and keep `react` / `react-dom` as normal dependencies
  of the Angular app.
- **Unstyled grid** — the theme stylesheet was not added to `angular.json` or
  `styles.css`.
- **Empty grid** — `values` is empty, or a field name does not match a key in the data
  (names are case-sensitive).
- **Zero-height grid** — the host element has no height; wrap it in a sized container.
- **Nothing renders under SSR** — expected; guard with `isPlatformBrowser` as above.
- **Inputs change but nothing updates** — you mutated the array/object in place. Assign
  a new reference so `ngOnChanges` fires.
- **`(configChange)` does not update the view** — with `[config]` bound you own the
  state; assign `this.config = $event`.
- **Decorator metadata errors in an exotic bundler** — the component uses `inject()`
  rather than constructor injection precisely to avoid that; make sure you are on a
  recent build of this package.

## Building and publishing

```bash
npm --prefix angular run typecheck   # tsc against tsconfig.build.json
npm --prefix angular run build       # builds the React package, then emits angular/dist
bun run test                         # whole repo suite, including the Angular tests
npm --prefix angular publish         # requires npm login
```

To try it locally without publishing:

```bash
npm --prefix angular run build
npm pack ./angular                   # produces a tarball
npm i /absolute/path/to/react-pivottable-enhanced-angular-1.0.0.tgz
```

## Licence & provenance

MIT. Not affiliated with, endorsed by, or derived from any commercial pivot table
product. Developed end to end with AI coding agents and published as is, without
warranty — review and test it before production use.
