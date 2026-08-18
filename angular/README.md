# react-pivottable-enhanced-angular

Angular wrapper for [`react-pivottable-enhanced`](https://github.com/rajatkusumwal/react-pivottable-enhanced) —
a commercial-style pivot table with drag & drop fields, filters, calculated values,
charts, drill-through, export and backend aggregation.

The pivot table itself is written in React. This package is a thin `<pivot-studio>`
Angular component that mounts it, maps every input onto a React prop and re-emits the
React callbacks as Angular outputs. No pivot logic lives here, so Angular and React
apps always get exactly the same features.

- Source: https://github.com/rajatkusumwal/react-pivottable-enhanced
- Issues: https://github.com/rajatkusumwal/react-pivottable-enhanced/issues

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
uses. If your app already runs Tailwind, add the library to your content scan instead
(see the React package README).

## Hello pivot

```ts
import { Component } from "@angular/core";
import { PivotStudioComponent, sampleData, sampleFields } from "react-pivottable-enhanced-angular";

@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  selector: "app-reports",
  template: `
    <pivot-studio
      [data]="data"
      [fields]="fields"
      title="Sales report"
      (configChange)="saveLayout($event)"
    ></pivot-studio>
  `,
})
export class ReportsComponent {
  data = sampleData;
  fields = sampleFields;
  saveLayout(config: unknown) {
    localStorage.setItem("pivot-layout", JSON.stringify(config));
  }
}
```

Not on standalone components yet? Import the NgModule instead:

```ts
import { NgModule } from "@angular/core";
import { PivotStudioModule } from "react-pivottable-enhanced-angular";

@NgModule({ imports: [PivotStudioModule] })
export class ReportsModule {}
```

## Inputs

| Input               | Type                                          | Default          | What it does                                          |
| ------------------- | --------------------------------------------- | ---------------- | ----------------------------------------------------- |
| `data`              | `PivotRow[]`                                  | `[]`             | Records to analyse (used by the local engine)          |
| `fields`            | `FieldDef[]`                                  | `[]`             | Field metadata; use `inferFields(data)` if you have none |
| `engine`            | `PivotEngineAdapter`                          | local engine     | Swap browser aggregation for a backend service         |
| `initialConfig`     | `Partial<PivotConfig>`                        | —                | Starting layout (uncontrolled)                         |
| `config`            | `PivotConfig`                                 | —                | Fully controlled layout; pair with `(configChange)`    |
| `permissions`       | `Permissions`                                 | all allowed      | Turn off edit / export / drill-through                 |
| `title`             | `string`                                      | `"Pivot table"`  | Accessible name of the pivot region                    |
| `className`         | `string`                                      | `""`             | Extra classes on the wrapper                           |
| `showSidebar`       | `boolean`                                     | `true`           | Show the docked field panel                            |
| `showToolbar`       | `boolean`                                     | `true`           | Show the toolbar                                       |
| `allowFileUpload`   | `boolean`                                     | `false`          | Show the "import your own file" bar                    |
| `onUploadToBackend` | `UploadHandler`                               | —                | Send uploads to your service instead of memory         |
| `datasetId`         | `string`                                      | —                | Dataset handle for backend queries                     |
| `fieldsUi`          | `"dialog" \| "sidebar"`                       | `"dialog"`       | Field bar + popup, or docked panel                     |

## Outputs

| Output         | Payload       | Fires when                                                     |
| -------------- | ------------- | -------------------------------------------------------------- |
| `configChange` | `PivotConfig` | The report layout changes (drag & drop, sorting, filters, …)     |
| `dataChange`   | `PivotRow[]`  | Inline editing writes new values back into the records           |

Both are emitted inside the Angular zone, so change detection runs as usual.

## Controlled layout

```ts
@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  template: `<pivot-studio [data]="data" [fields]="fields" [config]="config"
    (configChange)="config = $event"></pivot-studio>`,
})
export class ControlledComponent {
  config: PivotConfig = { ...createDefaultConfig(), rows: ["Region"], values: [{ field: "Revenue", aggregator: "sum" }] };
}
```

## Backend aggregation

Point the pivot at your own service (for example Spring Boot + DuckDB). The REST
contract is documented in the React package README.

```ts
import { createBackendEngine } from "react-pivottable-enhanced-angular";

export class ReportsComponent {
  engine = createBackendEngine({ baseUrl: "/api/pivot" });
  datasetId = "sales-2026";
}
```

```html
<pivot-studio [engine]="engine" [datasetId]="datasetId" [data]="[]" [fields]="fields"></pivot-studio>
```

## Server-side rendering

The pivot renders in the browser only. Under Angular Universal, guard the component:

```html
@if (isBrowser) {
  <pivot-studio [data]="data" [fields]="fields"></pivot-studio>
}
```

```ts
isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
```

## Escape hatch: mount it yourself

`createPivotMount(hostElement)` is the framework-free glue the component uses. Use it
directly if you need to mount the pivot outside Angular's component lifecycle.

```ts
const mount = createPivotMount(hostEl);
mount.render({ data, fields });
mount.destroy();
```

## Troubleshooting

- **"Invalid hook call" / two Reacts** — your app has more than one copy of `react`.
  Deduplicate it (`npm dedupe`) and keep `react` / `react-dom` as normal dependencies
  of the Angular app.
- **Unstyled grid** — the theme stylesheet was not added to `angular.json` or
  `styles.css`.
- **Nothing renders under SSR** — expected; guard with `isPlatformBrowser` as above.
- **Bundle size** — this route ships React + ReactDOM (~50–150 KB gzipped) inside your
  Angular app. That is the cost of reusing the React implementation rather than
  maintaining a second one.

## Licence & provenance

MIT. Developed end to end with AI coding agents and published as is, without
warranty — review and test it before production use.
