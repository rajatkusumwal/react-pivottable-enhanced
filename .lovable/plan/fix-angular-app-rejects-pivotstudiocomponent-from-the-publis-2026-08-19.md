# Fix: Angular app rejects `PivotStudioComponent` from the published wrapper

## What the error means

Your app fails with:

```text
TS-992012: Component imports must be standalone components, directives, pipes, or must be NgModules.
  imports: [PivotStudioComponent]
```

This is not a bug in your app. The `react-pivottable-enhanced-angular` package is
currently built with plain TypeScript (`tsc -p angular/tsconfig.build.json`). Plain
`tsc` emits `@Component` as a legacy `__decorate([...])` call, which the Angular
compiler in your app cannot read — it sees a normal class with no Angular metadata,
so it can't tell that it is a standalone component.

Angular libraries must be compiled by the Angular compiler in **partial compilation
mode**, which emits `ɵɵngDeclareComponent` metadata that the Angular linker in the
consuming app expands at build time. That is the missing piece.

(The second error in your screenshot, `TS2305: ... has no exported member
'PivotottableComponent'` in `app.routes.ts`, is a separate export-name mismatch in
your own app file and will resolve once the wrapper compiles and you import the
correct symbol name.)

## The fix, in this repo

1. Add `@angular/compiler-cli` as a dev dependency of the `angular/` workspace.
2. Change `angular/tsconfig.build.json` to add:
   ```json
   "angularCompilerOptions": { "compilationMode": "partial", "strictTemplates": true }
   ```
3. Change the build script from `tsc -p tsconfig.build.json` to
   `ngc -p tsconfig.build.json`, so the emitted `dist/` contains Angular partial
   declarations plus the same `.d.ts` files.
4. Keep the `angular:typecheck` script working (`ngc ... --noEmit`).
5. Verify the emitted `dist/pivot-studio.component.js` contains
   `ɵɵngDeclareComponent` and `standalone: true` — that is the proof the fix works.

## Tests

Extend `angular/src/package.test.ts` (which already builds and inspects the package)
with three checks:

- normal case: built output contains `ngDeclareComponent` and marks the component
  standalone;
- edge case: no legacy `__decorate(` decorator emit remains in the bundle;
- worst case: `react`, `react-dom` and `@angular/*` stay external (not inlined).

Run `bun run test` plus `bun run angular:build`.

## Docs

- `angular/README.md`: troubleshooting entry for `TS-992012` explaining partial
  compilation, and an updated "Building and publishing" section.
- `AGENTS.md` / `CONTRIBUTING.md`: the Angular package is built with `ngc`, never
  plain `tsc`.

## What you do afterwards

Republish (or `npm pack`) the Angular package and reinstall it in your Angular app;
`imports: [PivotStudioComponent]` then compiles. Also make sure your app imports the
name it actually exports in `app.routes.ts`.
