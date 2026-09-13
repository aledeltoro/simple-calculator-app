/**
 * A pure client-side pre-validation layer for expressions before they are sent
 * to the backend.
 *
 * The backend remains the source of truth for domain errors (division by zero,
 * complex results, parse errors); this layer only pre-empts obvious syntactic
 * problems for faster UX.
 *
 * Boundary rule: `calculator/` imports nothing from React, `api/`, or `hooks/`.
 */

export interface ValidationResult {
  valid: boolean;
  /** User-facing message when `valid` is false (mirrors backend wording). */
  message: string | null;
}

/** Allowed characters: digits, operators, parens, dot, whitespace, power. */
const ALLOWED_PATTERN = /^[0-9+\-*/().\s^]*$/;
const TRAILING_OPERATOR = /[+\-*/^.]$/;
const LEADING_OPERATOR = /^[+*/^]/;

function areParenthesesBalanced(input: string): boolean {
  let depth = 0;
  for (const ch of input) {
    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth < 0) {
        return false;
      }
    }
  }
  return depth === 0;
}

export function validateExpression(expression: string): ValidationResult {
  const trimmed = expression.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: "empty expression" };
  }
  if (!ALLOWED_PATTERN.test(trimmed)) {
    return { valid: false, message: "expression parsing failed" };
  }
  if (!areParenthesesBalanced(trimmed)) {
    return { valid: false, message: "expression parsing failed" };
  }
  if (TRAILING_OPERATOR.test(trimmed)) {
    return { valid: false, message: "expression parsing failed" };
  }
  if (LEADING_OPERATOR.test(trimmed)) {
    return { valid: false, message: "expression parsing failed" };
  }

  return { valid: true, message: null };
}
