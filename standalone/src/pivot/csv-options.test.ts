import { describe, expect, it } from "vitest";
import { detectCsvOptions, formatCsvNumber, parseCsvNumber } from "./csv";
import { parseCsv } from "./data-sources";
import { toCsv } from "./export";
import type { ExportMatrix } from "./export";

const matrix: ExportMatrix = {
  title: "Sales",
  head: [["Country", "Revenue"]],
  body: [
    ["France", "1234.5"],
    ["Ger;many", "9876543.25"],
  ],
};

describe("CSV separator / decimal / thousands options", () => {
  it("parses numbers written in the European dialect", () => {
    expect(parseCsvNumber("1.234,56", { decimalSeparator: ",", thousandsSeparator: "." })).toBe(
      1234.56,
    );
    expect(parseCsvNumber("1 234,5", { decimalSeparator: "," })).toBe(1234.5);
    expect(parseCsvNumber("12.5")).toBe(12.5);
    expect(parseCsvNumber("N/A")).toBeNull();
  });

  it("writes numbers back in the chosen dialect", () => {
    expect(formatCsvNumber(1234567.89, { decimalSeparator: ",", thousandsSeparator: "." })).toBe(
      "1.234.567,89",
    );
    expect(formatCsvNumber(-1234, { thousandsSeparator: "," })).toBe("-1,234");
    expect(formatCsvNumber(12.5)).toBe("12.5");
  });

  it("reads a semicolon file with comma decimals", () => {
    const rows = parseCsv("Country;Revenue\nFrance;1.234,56\nSpain;7,5", {
      delimiter: ";",
      decimalSeparator: ",",
      thousandsSeparator: ".",
    });
    expect(rows).toEqual([
      { Country: "France", Revenue: 1234.56 },
      { Country: "Spain", Revenue: 7.5 },
    ]);
  });

  it("still reads a plain comma file with dot decimals", () => {
    expect(parseCsv("a,b\n1,2.5")).toEqual([{ a: 1, b: 2.5 }]);
  });

  it("detects the dialect of a file", () => {
    expect(detectCsvOptions("a;b\n1.234,56;x")).toEqual({
      delimiter: ";",
      decimalSeparator: ",",
      thousandsSeparator: ".",
    });
    expect(detectCsvOptions("a,b\n1.5,2").delimiter).toBe(",");
    expect(detectCsvOptions("a\tb\n1\t2").delimiter).toBe("\t");
  });

  it("exports with the chosen separator and decimal mark", () => {
    const csv = toCsv(matrix, { delimiter: ";", decimalSeparator: ",", thousandsSeparator: "." });
    expect(csv.split("\n")[0]).toBe("Country;Revenue");
    expect(csv).toContain("France;1.234,5");
    expect(csv).toContain('"Ger;many";9.876.543,25');
  });

  it("round-trips an exported file through the parser", () => {
    const options = { delimiter: ";", decimalSeparator: ",", thousandsSeparator: "." };
    const rows = parseCsv(toCsv(matrix, options), options);
    expect(rows[0]).toEqual({ Country: "France", Revenue: 1234.5 });
    expect(rows[1]?.["Revenue"]).toBe(9876543.25);
  });
});
