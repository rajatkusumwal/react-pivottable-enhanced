import type { CalculatedField, PivotRow } from "./types";

/**
 * A tiny, safe formula evaluator for calculated values.
 * Supports: numbers, [field] references, + - * / % ^, parentheses and the
 * functions abs, round, min, max, sqrt. It never uses eval/Function, so a
 * formula coming from user input cannot execute arbitrary code.
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
      if (!(FUNCTIONS as readonly string[]).includes(name)) {
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

export function evaluateFormula(formula: string, row: PivotRow): number | null {
  const rpn = toRpn(tokenize(formula));
  const stack: number[] = [];
  for (const token of rpn) {
    if (token.t === "num") stack.push(token.v);
    else if (token.t === "field") {
      const n = Number(row[token.v]);
      stack.push(Number.isFinite(n) ? n : 0);
    } else if (token.t === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Malformed formula");
      switch (token.v) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          stack.push(b === 0 ? 0 : a / b);
          break;
        case "%":
          stack.push(b === 0 ? 0 : a % b);
          break;
        case "^":
          stack.push(a ** b);
          break;
        default:
          throw new Error(`Unknown operator ${token.v}`);
      }
    } else if (token.t === "fn") {
      if (token.v === "min" || token.v === "max") {
        const b = stack.pop() ?? 0;
        const a = stack.pop() ?? 0;
        stack.push(token.v === "min" ? Math.min(a, b) : Math.max(a, b));
      } else {
        const a = stack.pop() ?? 0;
        stack.push(token.v === "abs" ? Math.abs(a) : token.v === "round" ? Math.round(a) : Math.sqrt(a));
      }
    }
  }
  const result = stack.pop();
  return result === undefined || !Number.isFinite(result) ? null : result;
}

export function validateFormula(formula: string): string | null {
  try {
    evaluateFormula(formula, {});
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid formula";
  }
}

/** Adds one extra column per calculated field to every source row. */
export function applyCalculatedFields(
  rows: PivotRow[],
  calculated: CalculatedField[],
): PivotRow[] {
  if (!calculated.length) return rows;
  return rows.map((row) => {
    const next: PivotRow = { ...row };
    for (const field of calculated) {
      try {
        next[field.name] = evaluateFormula(field.formula, next);
      } catch {
        next[field.name] = null;
      }
    }
    return next;
  });
}
