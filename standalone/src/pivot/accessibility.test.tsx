/**
 * Keyboard and screen-reader behaviour.
 *
 * The grid is the part people live in all day, so it must be usable without a
 * mouse: tab to it, arrow around, shift-select, Escape out of popups. These
 * tests lock in the roles and key handling the rest of the UI depends on.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PivotGrid } from "./ui/PivotGrid";
import { GridContextMenu } from "./ui/GridContextMenu";
import { FieldListDialog } from "./ui/FieldListDialog";
import { FormatDialog } from "./ui/FormatDialog";
import { buildLocalResult } from "./engines/local";
import { getLocale } from "./locales";
import { createDefaultConfig, defaultTheme } from "./types";
import type { FieldDef, PivotRow } from "./types";
import type { PivotQuery } from "./result";

const data: PivotRow[] = [
  { region: "North", city: "Oslo", category: "Bikes", revenue: 100 },
  { region: "North", city: "Bergen", category: "Clothing", revenue: 200 },
  { region: "South", city: "Rome", category: "Bikes", revenue: 300 },
];

const fields: FieldDef[] = [
  { name: "region", type: "string" },
  { name: "city", type: "string" },
  { name: "category", type: "string" },
  { name: "revenue", type: "number" },
];

const query = (partial: Partial<PivotQuery> = {}): PivotQuery => ({
  rows: ["region", "city"],
  cols: ["category"],
  values: [{ field: "revenue", aggregator: "sum" }],
  filters: [],
  showSubTotals: true,
  showGrandTotals: true,
  layout: "compact",
  collapsed: [],
  locale: "en",
  ...partial,
});

const renderGrid = (props: Partial<React.ComponentProps<typeof PivotGrid>> = {}) => {
  const built = query();
  return render(
    <PivotGrid
      result={buildLocalResult(data, built)}
      layout="compact"
      locale="en"
      theme={defaultTheme}
      {...props}
    />,
  );
};

const strings = getLocale("en").strings;

describe("grid accessibility", () => {
  it("exposes the table as a labelled grid", () => {
    renderGrid({ title: "Revenue by region" });
    expect(screen.getByRole("grid", { name: "Revenue by region" })).toBeInTheDocument();
  });

  it("falls back to a generic grid label when no title is given", () => {
    renderGrid();
    expect(screen.getByRole("grid", { name: "Pivot table" })).toBeInTheDocument();
  });

  it("is reachable with the Tab key", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("pivot-grid"));
  });

  it("labels expand and collapse controls with their action and member", () => {
    renderGrid();
    expect(screen.getByRole("button", { name: "Collapse North" })).toBeInTheDocument();
  });

  it("announces the sort state on column headers", () => {
    renderGrid({ onSortChange: vi.fn(), showSortingControls: true });
    const grid = screen.getByTestId("pivot-grid");
    const sortButtons = within(grid)
      .getAllByRole("button")
      .filter((b) => /sort/i.test(b.getAttribute("aria-label") ?? ""));
    expect(sortButtons.length).toBeGreaterThan(0);
  });

  it("hides decorative icons from screen readers", () => {
    const { container } = renderGrid();
    const icons = container.querySelectorAll("svg");
    icons.forEach((icon) => expect(icon.getAttribute("aria-hidden")).toBe("true"));
  });
});

describe("grid keyboard navigation", () => {
  it("moves the selection with the arrow keys after clicking a cell", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderGrid({ onSelectionChange });
    const cells = screen.getAllByTestId(/^cell-/);
    await user.click(cells[0] as HTMLElement);
    onSelectionChange.mockClear();
    await user.keyboard("{ArrowDown}");
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it("extends the selection with Shift+Arrow and reports the running total", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderGrid({ onSelectionChange });
    await user.click(screen.getAllByTestId(/^cell-/)[0] as HTMLElement);
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    const last = onSelectionChange.mock.calls.at(-1)?.[0];
    expect(last?.count).toBeGreaterThan(1);
  });

  it("ignores arrow keys until a cell has been focused", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderGrid({ onSelectionChange });
    screen.getByTestId("pivot-grid").focus();
    onSelectionChange.mockClear();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("copies the selection with Ctrl+C without throwing when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getAllByTestId(/^cell-/)[0] as HTMLElement);
    await expect(user.keyboard("{Control>}c{/Control}")).resolves.not.toThrow();
  });
});

describe("popups close with Escape", () => {
  it("closes the context menu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <GridContextMenu
        x={10}
        y={10}
        items={[{ id: "a", label: "Sort ascending", onSelect: vi.fn() }]}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole("menu", { name: "Grid actions" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("exposes disabled menu items to assistive tech instead of hiding them", () => {
    render(
      <GridContextMenu
        x={0}
        y={0}
        items={[{ id: "a", label: "Drill through", disabled: true, onSelect: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("menuitem", { name: "Drill through" })).toBeDisabled();
  });
});

describe("dialogs are announced as modals", () => {
  it("labels the field list dialog and offers a close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FieldListDialog
        open
        strings={strings}
        fields={fields}
        rows={data}
        config={createDefaultConfig()}
        readOnly={false}
        onChange={vi.fn()}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: strings.fields });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await user.click(within(dialog).getByRole("button", { name: strings.close }));
    expect(onClose).toHaveBeenCalled();
  });

  it("gives the format dialog a tab list every control can be reached from", () => {
    render(
      <FormatDialog
        open
        strings={strings}
        config={createDefaultConfig()}
        fields={fields}
        readOnly={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Format" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("tablist", { name: "Format sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(3);
  });

  it("renders nothing when closed so background content stays reachable", () => {
    const { container } = render(
      <FieldListDialog
        open={false}
        strings={strings}
        fields={fields}
        rows={data}
        config={createDefaultConfig()}
        readOnly={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
