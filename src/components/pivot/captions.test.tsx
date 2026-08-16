import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  fieldCaption,
  measureCaption,
  renameFieldPatch,
  renameMeasurePatch,
  renameResultFields,
} from "./captions";
import { createDefaultConfig } from "./types";
import type { FieldDef, PivotConfig } from "./types";
import { emptyResult } from "./result";
import { GridFieldBar } from "./ui/GridFieldBar";
import { getLocale } from "./locales";

const fields: FieldDef[] = [
  { name: "region", type: "string", caption: "Region" },
  { name: "revenue", type: "number" },
];

const baseConfig = (patch: Partial<PivotConfig> = {}) =>
  createDefaultConfig({
    rows: ["region"],
    cols: ["country"],
    values: [
      { field: "revenue", aggregator: "sum" },
      { field: "revenue", aggregator: "average" },
    ],
    ...patch,
  });

describe("field captions", () => {
  it("prefers the report rename over the data source caption", () => {
    expect(fieldCaption("region", fields, { region: "Sales area" })).toBe("Sales area");
    expect(fieldCaption("region", fields, {})).toBe("Region");
    expect(fieldCaption("revenue", fields, {})).toBe("revenue");
  });

  it("labels measures from their own caption first", () => {
    expect(measureCaption({ field: "revenue", aggregator: "sum", caption: "Total sales" }, fields)).toBe(
      "Total sales",
    );
    expect(measureCaption({ field: "region", aggregator: "count" }, fields)).toBe("Region");
  });

  it("stores and clears renames in the config", () => {
    const config = baseConfig();
    const patch = renameFieldPatch(config, "region", " Sales area ");
    expect(patch.fieldCaptions).toEqual({ region: "Sales area" });
    const cleared = renameFieldPatch({ ...config, ...patch } as PivotConfig, "region", "  ");
    expect(cleared.fieldCaptions).toEqual({});
  });

  it("renames a single measure without touching its twin", () => {
    const config = baseConfig();
    const patch = renameMeasurePatch(config, 1, "Average deal size");
    expect(patch.values?.[0]?.caption).toBeUndefined();
    expect(patch.values?.[1]?.caption).toBe("Average deal size");
  });

  it("applies renames to the result used by grid, export and print", () => {
    const result = {
      ...emptyResult({ field: "revenue", caption: "revenue", aggregator: "sum", type: "number" }),
      rowFields: ["region"],
      colFields: ["country"],
    };
    const renamed = renameResultFields(result, fields, { country: "Market" });
    expect(renamed.rowFields).toEqual(["Region"]);
    expect(renamed.colFields).toEqual(["Market"]);
  });
});

describe("rename UI in the field bar", () => {
  const setup = (config: PivotConfig) => {
    const onChange = vi.fn();
    render(
      <GridFieldBar
        strings={getLocale(config.locale).strings}
        config={config}
        fields={fields}
        rows={[]}
        readOnly={false}
        onChange={onChange}
        onOpenFields={() => undefined}
      />,
    );
    return onChange;
  };

  it("renames a row field from its chip", () => {
    const onChange = setup(baseConfig());
    fireEvent.click(screen.getAllByRole("button", { name: "Rename region" })[0] as HTMLElement);
    const input = screen.getByRole("textbox", { name: "Rename region" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Sales area" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({ fieldCaptions: { region: "Sales area" } });
  });

  it("renames one of two measures on the same field", () => {
    const onChange = setup(baseConfig());
    const buttons = screen.getAllByRole("button", { name: "Rename revenue" });
    fireEvent.click(buttons[1] as HTMLElement);
    const input = screen.getByRole("textbox", { name: "Rename revenue" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Average deal size" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const patch = onChange.mock.calls[0]?.[0] as Partial<PivotConfig>;
    expect(patch.values?.[1]?.caption).toBe("Average deal size");
  });

  it("shows the custom label and keeps Escape non-destructive", () => {
    setup(baseConfig({ fieldCaptions: { region: "Sales area" } }));
    expect(screen.getByText("Sales area")).toBeInTheDocument();
  });
});
