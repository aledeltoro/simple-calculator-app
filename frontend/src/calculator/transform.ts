/**
 * Pure mapping from calculator button tokens to backend expression strings.
 *
 * Boundary rule: `calculator/` imports nothing from React, `api/`, or `hooks/`.
 */

export const OPERATOR_MAP = {
  "+": "+",
  "−": "-",
  "×": "*",
  "÷": "/",
  "xʸ": "^",
} as const;

export type OperatorToken = keyof typeof OPERATOR_MAP;
export type EmittedOperator = (typeof OPERATOR_MAP)[OperatorToken];

export type Digit =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";

/** Every token a calculator button can emit into the expression. */
export type ButtonToken = Digit | "." | OperatorToken | "(" | ")";

/** A plain, non-negative decimal number (no sign, no operators). */
const PLAIN_NUMBER = /^\d+(?:\.\d+)?$/;

/** Characters after which a `.` must be disambiguated with a leading `0`. */
const OPERATOR_LIKE = new Set(["+", "-", "*", "/", "(", "^"]);

/** Map a UI operator to its backend symbol (`×`→`*`, `÷`→`/`). */
export function mapOperator(token: OperatorToken): EmittedOperator {
  return OPERATOR_MAP[token];
}

/**
 * Wrap an operand in parentheses unless it is a plain, non-negative number.
 */
export function wrapOperand(operand: string): string {
  return PLAIN_NUMBER.test(operand) ? operand : `(${operand})`;
}

/** Append a digit to the current expression. */
export function appendDigit(expression: string, digit: Digit): string {
  return `${expression}${digit}`;
}

/**
 * Append a decimal point, disambiguating a leading dot (start of expression,
 * or immediately after an operator/paren) into `0.`.
 */
export function appendDecimalPoint(expression: string): string {
  if (expression.length === 0) {
    return "0.";
  }
  const last = expression[expression.length - 1];
  if (last !== undefined && OPERATOR_LIKE.has(last)) {
    return `${expression}0.`;
  }
  return `${expression}.`;
}

/** `√x` → `(x)^0.5`. Always parenthesizes the operand. */
export function applySqrt(operand: string): string {
  return `(${operand})^0.5`;
}

/** `%x` → `(x)/100`. Always parenthesizes the operand. */
export function applyPercent(operand: string): string {
  return `(${operand})/100`;
}

/**
 * `±` → `-(...)`. Plain non-negative numbers are negated bare (`-5`); compound
 * or already-grouped operands are parenthesized (`-(3+4)`).
 */
export function applyToggleSign(operand: string, grouped: boolean): string {
  if (grouped || !PLAIN_NUMBER.test(operand)) {
    return `-(${operand})`;
  }
  return `-${operand}`;
}

/** The trailing operand of an expression, decomposed for wrapping. */
export interface LastOperand {
  /** Everything before the operand. */
  prefix: string;
  /** The operand's inner content (outer parentheses stripped when grouped). */
  operand: string;
  /** True when the operand was a parenthesized group `(...)`. */
  grouped: boolean;
}

/** Find the index of the `(` matching the `)` at `closeIndex`, or -1. */
function findMatchingOpen(expression: string, closeIndex: number): number {
  let depth = 0;
  for (let i = closeIndex; i >= 0; i--) {
    const ch = expression[i];
    if (ch === ")") {
      depth++;
    } else if (ch === "(") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Split the trailing operand from an expression. Handles a trailing decimal
 * number or a trailing balanced parenthesized group. Returns `null` when there
 * is no identifiable trailing operand.
 */
export function splitLastOperand(expression: string): LastOperand | null {
  if (expression.length === 0) {
    return null;
  }

  const last = expression[expression.length - 1];
  if (last === ")") {
    const openIndex = findMatchingOpen(expression, expression.length - 1);
    if (openIndex >= 0) {
      return {
        prefix: expression.slice(0, openIndex),
        operand: expression.slice(openIndex + 1, expression.length - 1),
        grouped: true,
      };
    }
  }

  const match = expression.match(/(\d+(?:\.\d+)?|\.\d+)$/);
  if (match && match.index !== undefined && match[0] !== undefined) {
    const raw = match[0].startsWith(".") ? `0${match[0]}` : match[0];
    return {
      prefix: expression.slice(0, match.index),
      operand: raw,
      grouped: false,
    };
  }

  return null;
}

/**
 * Toggle the sign of the trailing operand in place. If the operand is already
 * negated (a `-` immediately precedes it), the negation is removed.
 */
export function toggleSignExpression(expression: string): string {
  const last = splitLastOperand(expression);
  if (last === null) {
    return expression;
  }

  if (last.prefix.endsWith("-")) {
    const prefix = last.prefix.slice(0, -1);
    const restored = last.grouped ? `(${last.operand})` : last.operand;
    return `${prefix}${restored}`;
  }

  return `${last.prefix}${applyToggleSign(last.operand, last.grouped)}`;
}
