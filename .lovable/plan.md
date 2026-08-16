# Make Pivot Studio look and feel like Flexmonster

Goal: users coming from Flexmonster should recognise the layout, the wording and the interactions — including dragging fields between areas — while the data still runs on react-pivottable and Orb.js underneath.

## What changes for the user

1. **Flexmonster-style toolbar**
   A light grey bar across the top with the familiar icon+label buttons in Flexmonster order: Connect (sample data / CSV / JSON), Save, Open, Grid, Charts, Format, Options, Fields, Fullscreen, Export. Buttons open small dropdown panels instead of the current flat row of controls.

2. **Field List dialog (the big one)**
   Replaces the always-visible sidebar with the Flexmonster "Fields" popup:
   - Left: searchable list of all fields, grouped by folder, each with a drag handle.
   - Right: four drop areas stacked — Filters (Report Filters), Columns, Rows, Values (Measures).
   - Drag a field from the list into an area, drag chips between areas, drag to reorder inside an area, drag out to remove.
   - Each Values chip has an aggregation dropdown (Sum, Count, Average, Distinct Count, Min, Max, …) exactly like Flexmonster's measure menu.
   - "Add calculated value" button opens the formula editor inside the same dialog.
   - Footer with Apply / Cancel, so changes are staged like Flexmonster.
   The sidebar stays available as an optional docked mode via a prop for hosts that prefer it.

3. **Drag and drop on the grid itself**
   Field name headers above the rows/columns of the grid become draggable chips (Flexmonster's in-grid field bar), so a user can drag "Country" from rows to columns without opening the dialog. Includes filter funnel icons on those chips that open the member checklist popup.

4. **Flexmonster visual language**
   Compact grid: thin 1px grey grid lines, light blue-grey header cells, bold subtotal/grand-total rows, blue selection highlight, right-aligned numbers, sticky row headers and column headers, hover row highlight, and the same font scale. Both engines (react-pivottable and Orb.js tabs) get the same skin so they look identical apart from engine capabilities.

5. **Familiar wording** — "Report Filters", "Measures", "Grand Total", "Drill through", "Save report", "Open report", matching Flexmonster labels rather than generic ones.

## Technical approach

- Add `dnd-kit` (`@dnd-kit/core` + `@dnd-kit/sortable`) for accessible drag and drop with keyboard support; no dependency on HTML5 drag events.
- New components in `src/components/pivot/ui/`:
  - `FieldListDialog.tsx` — the popup with draggable field list and the four droppable areas (staged config + Apply/Cancel).
  - `FieldChip.tsx` — sortable chip with remove, aggregation menu, filter icon.
  - `DropArea.tsx` — droppable area shell.
  - `GridFieldBar.tsx` — in-grid draggable field chips above the table.
  - `MemberFilterPopover.tsx` — checkbox member list with search / select-all, reusing `uniqueMembers` and existing `FilterDef`.
- Rewrite `PivotToolbar.tsx` into grouped dropdown buttons (Popover from shadcn) keeping the existing `onChange` / `onExport` / `onPrint` / `onCopy` / `onReset` callbacks — no changes to export, filter, calculated-field or aggregation logic.
- `PivotStudio.tsx`: new prop `fieldsUi?: "dialog" | "sidebar" | "none"` (default `"dialog"`), holds dialog open state and renders `GridFieldBar`. Existing props and config shape stay backward compatible.
- Skin: add Flexmonster-like tokens to `src/styles.css` (`--pivot-grid-line`, `--pivot-header-bg`, `--pivot-total-bg`, `--pivot-select`) and a shared `pivot-grid` class applied by both `ReactPivottablePanel` (overriding `pivottable.css`) and `OrbPanel`, so the two engines render visually identically.
- Tests: extend `PivotStudio.test.tsx` with drag-and-drop coverage using dnd-kit's keyboard sensor (move a field from the list into Rows, move a chip from Rows to Columns, remove a chip, change an aggregation) plus a render check that both engine tabs get the shared grid skin. Existing 30 tests must keep passing.
- Update `README.md`: new `fieldsUi` prop, drag-and-drop usage, and a short "coming from Flexmonster" mapping table.

## Out of scope

Feature parity with Flexmonster beyond looks and drag/drop (OLAP sources, native PDF/Excel writers, virtual scrolling of 1M rows) — the comparison page keeps reporting those honestly.
