import { describe, expect, it } from "vitest";
import { formatResult } from "./formatters";

describe("formatResult", () => {
  it("formats integers without a trailing .0", () => {
    expect(formatResult(5)).toBe("5");
    expect(formatResult(-42)).toBe("-42");
  });

  it("strips floating-point noise", () => {
    expect(formatResult(0.30000000000000004)).toBe("0.3");
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
  });

  it("trims trailing zeros in the fractional part", () => {
    expect(formatResult(1.2300)).toBe("1.23");
    expect(formatResult(2.5)).toBe("2.5");
  });

  it("normalizes negative zero", () => {
    expect(formatResult(-0)).toBe("0");
  });

  it("handles zero and one", () => {
    expect(formatResult(0)).toBe("0");
    expect(formatResult(1)).toBe("1");
  });

  it("handles NaN and infinities", () => {
    expect(formatResult(Number.NaN)).toBe("NaN");
    expect(formatResult(Number.POSITIVE_INFINITY)).toBe("Infinity");
    expect(formatResult(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
  });

  it("formats the SPEC reference result 18.2", () => {
    expect(formatResult(18.2)).toBe("18.2");
  });
});
