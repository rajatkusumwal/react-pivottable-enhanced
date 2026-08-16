import type { FieldDef, PivotRow } from "./types";

/** Minimal RFC-4180 style CSV parser (handles quotes and embedded commas). */
export function parseCsv(text: string, delimiter = ","): PivotRow[] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n") {
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length || record.length) {
    record.push(field);
    rows.push(record);
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  return body.map((cells) => {
    const row: PivotRow = {};
    header.forEach((name, i) => {
      const raw = (cells[i] ?? "").trim();
      const num = Number(raw);
      row[name.trim()] = raw !== "" && Number.isFinite(num) ? num : raw;
    });
    return row;
  });
}

/** Guesses field definitions from the first rows of a dataset. */
export function inferFields(rows: PivotRow[]): FieldDef[] {
  const sample = rows.slice(0, 50);
  const names = [...new Set(sample.flatMap((r) => Object.keys(r)))];
  return names.map((name) => {
    const values = sample.map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== "");
    const allNumbers = values.length > 0 && values.every((v) => Number.isFinite(Number(v)));
    const looksLikeDate =
      !allNumbers && values.length > 0 && values.every((v) => /^\d{4}-\d{2}(-\d{2})?/.test(String(v)));
    const looksLikeTime =
      !allNumbers && values.length > 0 && values.every((v) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(v)));
    return {
      name,
      caption: name.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: allNumbers ? "number" : looksLikeDate ? "date" : looksLikeTime ? "time" : "string",
    } satisfies FieldDef;
  });
}

export async function loadJsonUrl(url: string, signal?: AbortSignal): Promise<PivotRow[]> {
  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("The JSON file must contain an array of records");
  return json as PivotRow[];
}

export async function loadCsvUrl(url: string, signal?: AbortSignal): Promise<PivotRow[]> {
  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return parseCsv(await res.text());
}

export function readFileAsRows(file: File): Promise<PivotRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        resolve(file.name.toLowerCase().endsWith(".json") ? (JSON.parse(text) as PivotRow[]) : parseCsv(text));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Could not parse the file"));
      }
    };
    reader.readAsText(file);
  });
}
