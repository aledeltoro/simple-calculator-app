import { describe, expect, it } from "vitest";
import { toDisplay } from "./display";

describe("toDisplay", () => {
  it.each([
    ["(9)^0.5", "√9"],
    ["(3+4)^0.5", "√(3+4)"],
    ["(50)/100", "50%"],
    ["(1+2)/100", "(1+2)%"],
    ["2^3", "2^3"],
    ["2*3", "2×3"],
    ["8/2", "8÷2"],
    ["5-2", "5−2"],
    ["-5", "−5"],
    ["-(3+4)", "−(3+4)"],
  ] as const)("%s → %s", (expression, expected) => {
    expect(toDisplay(expression)).toBe(expected);
  });

  it("preserves addition and parentheses", () => {
    expect(toDisplay("2+3")).toBe("2+3");
    expect(toDisplay("(2+3)")).toBe("(2+3)");
  });

  it("substitutes operators inside a compound sqrt operand", () => {
    expect(toDisplay("(2*3)^0.5")).toBe("√(2×3)");
    expect(toDisplay("(3+4)^0.5")).toBe("√(3+4)");
  });

  it("is total on the empty string", () => {
    expect(toDisplay("")).toBe("");
  });

  it("falls through without throwing on unbalanced input", () => {
    expect(() => toDisplay("(3+4")).not.toThrow();
    expect(toDisplay("(3+4")).toBe("(3+4");
  });
});
