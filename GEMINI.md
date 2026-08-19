See [AGENTS.md](./AGENTS.md) for the project layout, the test-driven workflow and the code style rules. Read [README.md](./README.md) for how the pivot table is used and integrated.
Read [CONTRIBUTING.md](./CONTRIBUTING.md) before making a change; it covers the workflow, the code style and the rules for agent-authored patches.

This project was developed entirely with AI coding agents and is provided as is under the MIT licence — review and test before production use.

## Angular wrapper (`angular/`)

`angular/src` holds `react-pivottable-enhanced-angular`: a thin `<pivot-studio>`
component that mounts the React `PivotStudio`. Rules:

- Wrapper only — no pivot logic, no duplicated types. Types are re-exported from
  `react-pivottable-enhanced`.
- Every input maps 1:1 onto a React prop; outputs re-emit React callbacks inside the
  Angular zone.
- Tests sit next to the code (`angular/src/*.test.ts`) and run with the rest of the
  suite via `bun run test`.
- Build/typecheck with `bun run angular:build` / `bun run angular:typecheck`.
- The package is compiled with `ngc` in partial mode, never plain `tsc`; plain `tsc`
  output makes consuming apps fail with `TS-992012`.
