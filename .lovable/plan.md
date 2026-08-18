# Angular wrapper for react-pivottable-enhanced

Ship an official Angular integration that mounts the existing React `PivotStudio`
inside an Angular component, so Angular apps get every current feature without a
rewrite. The React library stays the single source of truth.

## What gets built

**A new in-repo package: `angular/` → `react-pivottable-enhanced-angular`**

- Standalone Angular component `<pivot-studio>` (Angular 17+ standalone API, no NgModule required; an
  optional NgModule export is included for older-style apps).
- Mounts `PivotStudio` with `ReactDOM.createRoot` on init, re-renders on input changes,
  unmounts on destroy.
- Runs React rendering outside Angular's zone and re-enters the zone when emitting
  outputs, so change detection stays predictable.

**Inputs (mirroring the React props)**

`data`, `fields`, `engine`, `initialConfig`, `config`, `permissions`, `title`,
`className`, `showSidebar`, `showToolbar`, `allowFileUpload`, plus the remaining
props exposed by `PivotStudioProps`.

**Outputs (Angular `EventEmitter`s)**

`configChange`, `dataChange`, and the other callback props, each emitted inside the
Angular zone.

**Peer dependencies**

`@angular/core`, `@angular/common`, `react`, `react-dom`, `react-pivottable-enhanced`.
Nothing else is added to consumers.

## Tests

- Wrapper mount/unmount: renders the grid, cleans up the React root on destroy.
- Input propagation: changing `data` / `config` re-renders with the new values.
- Output emission: `configChange` fires when a field is dragged/toggled; `dataChange`
  fires on inline edit.
- Zone behaviour: outputs arrive inside Angular's zone.
- Edge cases: empty data, missing `fields` (inference), rapid input changes, destroy
  before first render.
- Package test: the built Angular package exposes the expected entry points and does
  not bundle React.

Run with `bun run test`; Angular tests use Angular's `TestBed` with `zone.js` under
Vitest/jsdom, alongside the existing 342 tests.

## Docs and site updates

- `angular/README.md`: install, usage, full input/output API table, backend-engine
  example, SSR note (browser-only rendering), troubleshooting duplicate React.
- Root `README.md` and `standalone/README.md`: new "Framework integrations" section
  linking to the Angular package, with a short Angular snippet.
- Home page (`src/routes/index.tsx`): a "Framework integrations" block stating React
  is native and Angular is supported through the wrapper, with an install snippet and
  a link to the docs page.
- Docs page (`src/routes/docs.tsx`): an Angular tab/section with the same API table and
  a copy-pasteable component example.
- `AGENTS.md` / `CONTRIBUTING.md`: note the new `angular/` folder and its rules
  (wrapper only — no pivot logic lives there).

## Technical notes

- `angular/` is added as a workspace in the root `package.json`, built with
  `ng-packagr`-style output or a plain `tsc` build emitting ESM + `.d.ts`; React is
  external so only one React copy exists at runtime.
- The wrapper is a thin adapter: no pivot logic, no duplicated types. Types are
  re-exported from `react-pivottable-enhanced`.
- Known trade-off documented in the README: React + ReactDOM (~50–150 KB gzipped) ship
  inside the Angular app. A framework-agnostic core remains a later option.
