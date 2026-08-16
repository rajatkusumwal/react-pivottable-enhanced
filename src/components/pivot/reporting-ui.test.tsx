/**
 * Integration tests for the reporting UX added on top of the grid:
 * share-by-link, number & conditional formatting UI, fullscreen, the grid
 * context menu, drill-through export and export headers/footers.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PivotStudio } from "./PivotStudio";
import { createDefaultConfig } from "./types";
import type { PivotRow } from "./types";
import { matrixFromResult, matrixFromRows, toCsv, toHtml, toTsv } from "./export";
import { emptyResult } from "./result";

const data: PivotRow[] = [
  { region: "North", category: "Bikes", revenue: 100 },
  { region: "North", category: "Clothing", revenue: 200 },
  { region: "South", category: "Bikes", revenue: 300 },
  { region: "South", category: "Clothing", revenue: 400 },
];

const fields = [
  { name: "region", caption: "Region", type: "string" as const },
  { name: "category", caption: "Category", type: "string" as const },
  { name: "revenue", caption: "Revenue", type: "number" as const },
];

const baseConfig = createDefaultConfig({
  rows: ["region"],
  cols: ["category"],
  values: [{ field: "revenue", aggregator: "sum" }],
});

const setup = (props: Partial<React.ComponentProps<typeof PivotStudio>> = {}) =>
  render(<PivotStudio data={data} fields={fields} initialConfig={baseConfig} title="Test pivot" {...props} />);

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("export headers and footers", () => {
  const matrix = matrixFromResult(
    { ...emptyResult({ field: "revenue", aggregator: "sum", caption: "Revenue" }) },
    "en",
    "Report",
    { header: "Acme Ltd\nQ4 review", footer: "Confidential" },
  );

  it("prints the header above and the footer below in text formats", () => {
    const csv = toCsv(matrix);
    expect(csv.startsWith("Acme Ltd\nQ4 review")).toBe(true);
    expect(csv.trimEnd().endsWith("Confidential")).toBe(true);
    expect(toTsv(matrix)).toContain("Q4 review");
  });

  it("wraps them in header/footer elements for HTML and Excel", () => {
    const html = toHtml(matrix);
    expect(html).toContain('class="pivot-export-header"');
    expect(html).toContain("Confidential");
    expect(html.indexOf("pivot-export-header")).toBeLessThan(html.indexOf("<table>"));
  });
});

describe("drill-through export", () => {
  it("builds a matrix from raw records with decoration", () => {
    const matrix = matrixFromRows(
      [
        { region: "North", revenue: 100 },
        { region: "South", revenue: 300, note: "late" },
      ],
      "Drill",
      { header: "Records behind North" },
    );
    expect(matrix.head[0]).toEqual(["region", "revenue", "note"]);
    expect(matrix.body).toEqual([
      ["North", "100", ""],
      ["South", "300", "late"],
    ]);
    expect(toCsv(matrix)).toContain("Records behind North");
  });

  it("offers export, print and copy inside the drill-through dialog", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByTestId("cell-0-0"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Export the drill-through view")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /print/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("hides the export controls when the user may not export", async () => {
    const user = userEvent.setup();
    setup({ permissions: { allowExport: false } });
    await user.click(await screen.findByTestId("cell-0-0"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("Export the drill-through view")).toBeNull();
  });
});

describe("share a report by link", () => {
  it("copies a link that carries the current report", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    setup();
    await user.click(await screen.findByRole("button", { name: /share link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = writeText.mock.calls[0]?.[0] as string;
    expect(url).toContain("report=");
    expect(window.location.search).toContain("report=");
  });

  it("restores a report carried in the address bar", async () => {
    const { encodeReport } = await import("./report-link");
    const shared = createDefaultConfig({
      rows: ["category"],
      cols: [],
      values: [{ field: "revenue", aggregator: "sum" }],
    });
    window.history.replaceState(null, "", `/?report=${encodeReport(shared)}`);
    setup();
    expect(await screen.findByText("Shared report loaded")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Bikes")).toBeInTheDocument());
  });
});

describe("formatting UI", () => {
  it("changes decimals and currency for a measure", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("button", { name: /^format$/i }));
    const decimals = screen.getByLabelText("Decimals for revenue");
    await user.clear(decimals);
    await user.type(decimals, "0");
    await user.type(screen.getByLabelText("Currency for revenue"), "eur");
    expect(screen.getByLabelText("Currency for revenue")).toHaveValue("EUR");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.getByTestId("cell-0-0").textContent).toMatch(/€/));
  });

  it("adds a conditional formatting rule that colours matching cells", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("button", { name: /^format$/i }));
    await user.click(screen.getByRole("tab", { name: /conditional formatting/i }));
    await user.click(screen.getByRole("button", { name: /add rule/i }));
    const value = screen.getByLabelText("Rule 1 value");
    await user.clear(value);
    await user.type(value, "150");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => {
      const cell = screen.getByTestId("cell-0-1"); // North / Clothing = 200
      expect(cell.getAttribute("style")).toContain("background");
    });
  });

  it("removes a conditional formatting rule", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("button", { name: /^format$/i }));
    await user.click(screen.getByRole("tab", { name: /conditional formatting/i }));
    await user.click(screen.getByRole("button", { name: /add rule/i }));
    expect(screen.getByTestId("format-rule-0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove rule 1" }));
    expect(screen.queryByTestId("format-rule-0")).toBeNull();
  });

  it("captures export header and footer text", async () => {
    const onConfigChange = vi.fn();
    const user = userEvent.setup();
    setup({ onConfigChange });
    await user.click(await screen.findByRole("button", { name: /^format$/i }));
    await user.click(screen.getByRole("tab", { name: /export header/i }));
    await user.type(screen.getByLabelText("Export header"), "A");
    await waitFor(() =>
      expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ exportHeader: "A" })),
    );
  });
});

describe("fullscreen mode", () => {
  it("toggles the fullscreen overlay from the toolbar", async () => {
    const user = userEvent.setup();
    setup();
    const button = await screen.findByRole("button", { name: /full screen/i });
    await user.click(button);
    expect(screen.getByTestId("pivot-studio")).toHaveAttribute("data-fullscreen", "true");
    await user.click(screen.getByRole("button", { name: /exit full screen/i }));
    expect(screen.getByTestId("pivot-studio")).not.toHaveAttribute("data-fullscreen");
  });
});

describe("grid context menu", () => {
  const openMenu = async () => {
    const user = userEvent.setup();
    setup();
    await user.pointer({ keys: "[MouseRight]", target: await screen.findByTestId("cell-0-0") });
    return { user, menu: await screen.findByTestId("grid-context-menu") };
  };

  it("opens on right-click with the expected actions", async () => {
    const { menu } = await openMenu();
    const labels = within(menu)
      .getAllByRole("menuitem")
      .map((b) => b.textContent);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Copy this value",
        "Export to CSV",
        "Number formatting…",
        "Conditional formatting…",
      ]),
    );
  });

  it("opens the formatting dialog straight on the conditional tab", async () => {
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole("menuitem", { name: "Conditional formatting…" }));
    expect(await screen.findByTestId("conditional-format-tab")).toBeInTheDocument();
  });

  it("copies a single cell value", async () => {
    const { user, menu } = await openMenu();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await user.click(within(menu).getByRole("menuitem", { name: "Copy this value" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("100"));
  });

  it("closes on Escape", async () => {
    const { user } = await openMenu();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("grid-context-menu")).toBeNull());
  });
});
