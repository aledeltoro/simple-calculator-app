/**
 * Pure mapping from a backend expression string to a user-friendly display
 * string.
 *
 * The `expression` field is the authoritative API payload and must remain in
 * backend form (e.g. `(9)^0.5`, `(50)/100`, `2*3`, `-(3+4)`). This module
 * produces the human-readable equivalent (`√9`, `50%`, `2×3`, `−(3+4)`) for
 * display only — it is never sent to the API.
 *
 * Boundary rule: `calculator/` imports nothing from React, `api/`, or `hooks/`.
 */

/** A plain, non-negative decimal number (no sign, no operators). */
const PLAIN_NUMBER = /^\d+(?:\.\d+)?$/;

/**
 * Find the index of the `)` matching the `(` at `openIndex`, or -1 when the
 * group is unbalanced.
 */
function findMatchingClose(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/** `(x)^0.5` → `√x` (plain number) or `√(x)` (compound operand). */
function sqrtOf(inner: string): string {
  return PLAIN_NUMBER.test(inner) ? `√${inner}` : `√(${inner})`;
}

/** `(x)/100` → `x%` (plain number) or `(x)%` (compound operand). */
function percentOf(inner: string): string {
  return PLAIN_NUMBER.test(inner) ? `${inner}%` : `(${inner})%`;
}

/**
 * Recursively render an expression. Compound `(x)^0.5` and `(x)/100` groups are
 * matched on the raw backend string (using nested-aware parenthesis matching)
 * BEFORE the simple character substitutions run, so the `/` inside `/100` and
 * the symbols inside `^0.5` are never corrupted by `* → ×`, `/ → ÷`, `- → −`.
 */
function render(expression: string): string {
  let out = "";
  let i = 0;

  while (i < expression.length) {
    const ch = expression.charAt(i);

    if (ch === "(") {
      const close = findMatchingClose(expression, i);
      if (close !== -1) {
        const suffixStart = close + 1;
        if (expression.startsWith("^0.5", suffixStart)) {
          const inner = expression.slice(i + 1, close);
          out += sqrtOf(render(inner));
          i = suffixStart + 4; // consume "(...) ^0.5"
          continue;
        }
        if (expression.startsWith("/100", suffixStart)) {
          const inner = expression.slice(i + 1, close);
          out += percentOf(render(inner));
          i = suffixStart + 4; // consume "(...) /100"
          continue;
        }
      }
    }

    out += ch;
    i++;
  }

  return out
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−");
}

/**
 * Convert a backend expression to a friendly display string. Total: it never
 * throws and always returns a string (unbalanced input falls through to the
 * naive character substitutions).
 *
 * Known limitation: pathological nesting of compound groups is not guaranteed
 * to collapse every nested `(x)^0.5`/`(x)/100` (e.g. `(50%)%` from a
 * double-applied percent); such input is not producible through the keypad and
 * renders safely, just not ideally.
 */
export function toDisplay(expression: string): string {
  return render(expression);
}
