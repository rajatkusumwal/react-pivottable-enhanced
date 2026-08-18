import type { CalculatedField, PivotRow } from "./types";

/**
 * A tiny, safe formula evaluator for calculated values.
 *
 * Supports: numbers, [field] references, + - * / % ^, parentheses and the
 * functions abs, round, min, max, sqrt. It never uses eval/Function, so a
 * formula coming from user input cannot execute arbitrary code.
 *
 * Aggregate-scope formulas additionally get the total functions
 * `grandTotal([f])`, `rowTotal([f])`, `columnTotal([f])`,
 * `parentRowTotal([f])` and `parentColumnTotal([f])`, which resolve against the
 * cell being computed — that is what makes "share of the grand total" style
 * formulas possible.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "field"; v: string }
  | { t: "op"; v: string }
  | { t: "fn"; v: string }
  | { t: "comma" }
  | { t: "lp" }
  | { t: "rp" };

const FUNCTIONS = ["abs", "round", "min", "max", "sqrt"] as const;

/** Post-aggregation totals a formula can reach for. */
export type TotalScope = "grand" | "row" | "column" | "parentRow" | "parentColumn";

/** Lower-cased function name -> the total it resolves. */
export const TOTAL_FUNCTIONS: Record<string, TotalScope> = {
  grandtotal: "grand",
  rowtotal: "row",
  columntotal: "column",
  coltotal: "column",
  parentrowtotal: "parentRow",
  parentcolumntotal: "parentColumn",
  parentcoltotal: "parentColumn",
};

/** Resolves the values a formula asks for. */
export interface FormulaContext {
  /** `[field]` — the measure value for the current scope. */
  value: (field: string) => number | null;
  /** `grandTotal([field])` and friends. */
  total?: (scope: TotalScope, field: string) => number | null;
}

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };

export function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i] as string;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "[") {
      const end = formula.indexOf("]", i);
      if (end === -1) throw new Error("Unclosed [field] reference");
      tokens.push({ t: "field", v: formula.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < formula.length && /[0-9.]/.test(formula[j] as string)) j++;
      const v = Number(formula.slice(i, j));
      if (!Number.isFinite(v)) throw new Error(`Invalid number near "${formula.slice(i, j)}"`);
      tokens.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < formula.length && /[a-zA-Z_0-9]/.test(formula[j] as string)) j++;
      const name = formula.slice(i, j).toLowerCase();
      if (!(FUNCTIONS as readonly string[]).includes(name) && !(name in TOTAL_FUNCTIONS)) {
        throw new Error(`Unknown function "${name}"`);
      }

      tokens.push({ t: "fn", v: name });
      i = j;
      continue;
    }
    if (ch in PRECEDENCE) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lp" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "rp" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ t: "comma" });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}"`);
  }
  return tokens;
}

/** Shunting-yard: infix tokens -> reverse polish notation. */
export function toRpn(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const token of tokens) {
    if (token.t === "num" || token.t === "field") out.push(token);
    else if (token.t === "fn") stack.push(token);
    else if (token.t === "comma") {
      while (stack.length && stack[stack.length - 1]?.t !== "lp") out.push(stack.pop() as Token);
    } else if (token.t === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1] as Token;
        if (top.t === "op" && (PRECEDENCE[top.v] ?? 0) >= (PRECEDENCE[token.v] ?? 0)) {
          out.push(stack.pop() as Token);
        } else break;
      }
      stack.push(token);
    } else if (token.t === "lp") stack.push(token);
    else if (token.t === "rp") {
      while (stack.length && stack[stack.length - 1]?.t !== "lp") out.push(stack.pop() as Token);
      if (!stack.length) throw new Error("Unbalanced parentheses");
      stack.pop();
      if (stack.length && stack[stack.length - 1]?.t === "fn") out.push(stack.pop() as Token);
    }
  }
  while (stack.length) {
    const top = stack.pop() as Token;
    if (top.t === "lp") throw new Error("Unbalanced parentheses");
    out.push(top);
  }
  return out;
}

interface Item {
  v: number;
  /** Field name when the item came straight from a `[field]` reference. */
  field?: string;
}

/** Evaluates a formula against any value source (a record or a pivot cell). */
export function evaluateWithContext(formula: string, ctx: FormulaContext): number | null {
  const rpn = toRpn(tokenize(formula));
  const stack: Item[] = [];
  for (const token of rpn) {
    if (token.t === "num") stack.push({ v: token.v });
    else if (token.t === "field") {
      const n = ctx.value(token.v);
      stack.push({ v: Number.isFinite(Number(n)) ? Number(n) : 0, field: token.v });
    } else if (token.t === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Malformed formula");
      switch (token.v) {
        case "+":
          stack.push({ v: a.v + b.v });
          break;
        case "-":
          stack.push({ v: a.v - b.v });
          break;
        case "*":
          stack.push({ v: a.v * b.v });
          break;
        case "/":
          stack.push({ v: b.v === 0 ? 0 : a.v / b.v });
          break;
        case "%":
          stack.push({ v: b.v === 0 ? 0 : a.v % b.v });
          break;
        case "^":
          stack.push({ v: a.v ** b.v });
          break;
        default:
          throw new Error(`Unknown operator ${token.v}`);
      }
    } else if (token.t === "fn") {
      const scope = TOTAL_FUNCTIONS[token.v];
      if (scope) {
        const arg = stack.pop();
        if (!arg?.field) throw new Error(`${token.v}() needs a [field] reference`);
        const total = ctx.total ? ctx.total(scope, arg.field) : 0;
        stack.push({ v: Number.isFinite(Number(total)) ? Number(total) : 0 });
      } else if (token.v === "min" || token.v === "max") {
        const b = stack.pop()?.v ?? 0;
        const a = stack.pop()?.v ?? 0;
        stack.push({ v: token.v === "min" ? Math.min(a, b) : Math.max(a, b) });
      } else {
        const a = stack.pop()?.v ?? 0;
        stack.push({
          v: token.v === "abs" ? Math.abs(a) : token.v === "round" ? Math.round(a) : Math.sqrt(a),
        });
      }
    }
  }
  const result = stack.pop()?.v;
  return result === undefined || !Number.isFinite(result) ? null : result;
}

export function evaluateFormula(formula: string, row: PivotRow): number | null {
  return evaluateWithContext(formula, {
    value: (field) => {
      const n = Number(row[field]);
      return Number.isFinite(n) ? n : 0;
    },
    total: () => 0,
  });
}

export function validateFormula(formula: string): string | null {
  try {
    evaluateFormula(formula, {});
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid formula";
  }
}

/** True for formulas evaluated per grid cell instead of per record. */
export const isAggregateField = (field: CalculatedField) => field.scope === "aggregate";

/**
 * Adds one extra column per row-scope calculated field to every source row.
 * Aggregate-scope fields are skipped — the engine evaluates those per cell.
 */
export function applyCalculatedFields(rows: PivotRow[], calculated: CalculatedField[]): PivotRow[] {
  const rowScope = calculated.filter((f) => !isAggregateField(f));
  if (!rowScope.length) return rows;
  return rows.map((row) => {
    const next: PivotRow = { ...row };
    for (const field of rowScope) {
      try {
        next[field.name] = evaluateFormula(field.formula, next);
      } catch {
        next[field.name] = null;
      }
    }
    return next;
  });
}
