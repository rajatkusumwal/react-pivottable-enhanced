# Conditional filters for date fields

Today a "Condition" filter only compares numbers or text. Filtering `Order date` with
"greater than 2024-03-01" falls back to a numeric compare and silently matches nothing.
This adds real date handling end to end: UI, engine, backend contract, tests, docs.

## What the user gets

- In the filter builder, picking a date field switches the condition editor to date mode:
  operators read "is before", "is after", "is on or before", "is on or after", "is on",
  "is not on", "is between", and the value inputs become date pickers.
- Date filters work identically in the browser engine and against the REST backend, so the
  same saved report runs either way.
- Sample data's `Order date` is declared as a real date field so the demo shows the behaviour.

## Implementation

**Types** (`src/components/pivot/types.ts`)

- Add `valueType?: "auto" | "number" | "text" | "date"` to the `condition` filter variant
  (defaults to `auto` so existing configs keep working).
- Mark date-capable operators explicitly; reuse the existing `ConditionOperator` union
  (`gt`/`gte`/`lt`/`lte`/`eq`/`neq`/`between`) with date semantics, no new operator names,
  so the backend contract stays stable.

**Matching** (`src/components/pivot/filters.ts`)

- Add a `parseDate` helper accepting ISO strings (`YYYY-MM-DD`, full ISO), epoch numbers and
  `Date` values; day-level comparison normalised to UTC midnight so `eq` on a timestamp
  matches the whole day.
- `matchesCondition` gains an optional `valueType`; when it is `date` (or `auto` and both
  sides parse as dates) it compares timestamps instead of `Number(...)`. Unparseable values
  never match.
- `applyFilters` passes `filter.valueType` through; `describeFilter` prints date-aware wording.

**Editor** (`src/components/pivot/ui/FilterEditor.tsx`)

- Track the selected field's type; when `date`, render `<input type="date">` for value and
  value2, show the date operator labels, and emit `valueType: "date"` on the created filter.
- Top/bottom-N and member filters are unchanged.

**Sample data** (`src/components/pivot/sample-data.ts`)

- Change `orderDate` field definition to `type: "date"` (values already `YYYY-MM-DD`).

**Backend / mock API**

- No transport change needed: `valueType` rides along in the existing `filters` array of
  `POST /api/pivot/query` and `/drillthrough`. `createMockPivotApi` already delegates to
  `applyFilters`, so it gains date support automatically.

## Tests

- `src/components/pivot/pivot-core.test.ts`: unit coverage for each date operator, `between`,
  timestamp-vs-day matching, invalid dates, and `auto` inference.
- `src/components/pivot/PivotStudio.test.tsx`: add a date condition filter through the filter
  editor and assert the grid rows shrink to the expected range.
- `src/components/pivot/engines/mock-api.test.ts`: a date-condition query and drill-through
  round trip over the mocked REST endpoints.

## Docs

- README filter section: document `valueType`, the date operator semantics, and a JSON
  example of a date condition in the query payload.
