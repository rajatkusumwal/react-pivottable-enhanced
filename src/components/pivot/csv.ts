/**
 * CSV dialect options — separator, decimal mark and thousands mark.
 *
 * European exports use ";" as the field separator, "," as the decimal mark and
 * "." (or a space) for thousands. These options are used both when reading a
 * file and when exporting, so a round trip keeps the same dialect.
 */

export interface CsvOptions {
  /** Field separator. "," by default; "\t" and ";" are common alternatives. */
  delimiter: string;
  /** Decimal mark inside numbers. "." by default. */
  decimalSeparator: string;
  /** Thousands mark stripped when reading and inserted when writing. "" = none. */
  thousandsSeparator: string;
}

export const defaultCsvOptions: CsvOptions = {
  delimiter: ",",
  decimalSeparator: ".",
  thousandsSeparator: "",
};

export const csvOptions = (partial: Partial<CsvOptions> | string = {}): CsvOptions =>
  typeof partial === "string"
    ? { ...defaultCsvOptions, delimiter: partial }
    : { ...defaultCsvOptions, ...partial };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Parses a CSV number written in the given dialect.
 * Returns null when the text is not a number in that dialect.
 */
export function parseCsvNumber(raw: string, options: Partial<CsvOptions> = {}): number | null {
  const o = csvOptions(options);
  const text = raw.trim();
  if (!text) return null;
  let cleaned = text;
  if (o.thousandsSeparator) cleaned = cleaned.split(o.thousandsSeparator).join("");
  // A space is always treated as a thousands mark inside digits (fr-FR style).
  cleaned = cleaned.replace(/(\d)[\s\u00a0](?=\d{3}\b)/g, "$1");
  if (o.decimalSeparator !== ".") {
    if (cleaned.includes(".") && o.decimalSeparator === ",") return null;
    cleaned = cleaned.split(o.decimalSeparator).join(".");
  }
  if (!/^[+-]?\d*\.?\d+(e[+-]?\d+)?$/i.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/** Writes a number back in the given dialect (inverse of `parseCsvNumber`). */
export function formatCsvNumber(value: number, options: Partial<CsvOptions> = {}): string {
  const o = csvOptions(options);
  const [int = "", frac] = Math.abs(value).toString().split(".");
  const grouped = o.thousandsSeparator
    ? int.replace(/\B(?=(\d{3})+(?!\d))/g, o.thousandsSeparator)
    : int;
  const sign = value < 0 ? "-" : "";
  return sign + grouped + (frac ? o.decimalSeparator + frac : "");
}

/**
 * Guesses the dialect of a CSV text by looking at the header line and the
 * numbers in the body. Used to pre-fill the CSV options in the UI.
 */
export function detectCsvOptions(text: string): CsvOptions {
  const sample = text.slice(0, 64_000);
  const [headerLine = ""] = sample.split(/\r?\n/);
  const candidates = [",", ";", "\t", "|"];
  const best = candidates
    .map((d) => ({ d, n: headerLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0];
  const delimiter = best && best.n > 1 ? best.d : ",";
  const body = sample.split(/\r?\n/).slice(1).join("\n");
  const commaDecimals = (body.match(/\d,\d{1,2}(?!\d)/g) ?? []).length;
  const dotDecimals = (body.match(/\d\.\d{1,2}(?!\d)/g) ?? []).length;
  const decimalSeparator = delimiter !== "," && commaDecimals > dotDecimals ? "," : ".";
  const thousandsRe = new RegExp(
    `\\d${escapeRe(decimalSeparator === "," ? "." : ",")}\\d{3}\\b`,
    "g",
  );
  const thousandsSeparator = (body.match(thousandsRe) ?? []).length
    ? decimalSeparator === ","
      ? "."
      : ","
    : "";
  return { delimiter, decimalSeparator, thousandsSeparator };
}
