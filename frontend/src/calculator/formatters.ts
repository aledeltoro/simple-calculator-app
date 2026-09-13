/**
 * Pure number → display-string formatting.
 *
 * Boundary rule: `calculator/` imports nothing from React, `api/`, or `hooks/`.
 */

export const MAX_SIGNIFICANT_DIGITS = 12;

/**
 * Format a numeric result for a compact, human-readable display:
 * - strips floating-point noise (e.g. `0.30000000000000004` → `0.3`);
 * - renders integers without a trailing `.0`;
 * - trims trailing zeros in the fractional part;
 * - normalizes negative zero to `0`.
 */
export function formatResult(value: number): string {
  if (Number.isNaN(value)) {
    return "NaN";
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? "Infinity" : "-Infinity";
  }
  if (Object.is(value, -0)) {
    return "0";
  }

  const significant = Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS));

  if (Number.isInteger(significant)) {
    return String(significant);
  }

  let text = String(significant);
  text = text.replace(/(\.\d*?)0+$/, "$1");
  text = text.replace(/\.$/, "");
  return text;
}
