import { describe, expect, it } from "vitest";
import {
  appendDecimalPoint,
  appendDigit,
  applyPercent,
  applySqrt,
  applyToggleSign,
  mapOperator,
  splitLastOperand,
  toggleSignExpression,
  wrapOperand,
} from "./transform";

describe("mapOperator", () => {
  it.each([
    ["+", "+"],
    ["−", "-"],
    ["×", "*"],
    ["÷", "/"],
    ["xʸ", "^"],
  ] as const)("maps %s → %s", (token, expected) => {
    expect(mapOperator(token)).toBe(expected);
  });
});

describe("wrapOperand", () => {
  it("does not wrap plain non-negative numbers", () => {
    expect(wrapOperand("5")).toBe("5");
    expect(wrapOperand("3.14")).toBe("3.14");
  });

  it("wraps compound operands", () => {
    expect(wrapOperand("3+4")).toBe("(3+4)");
    expect(wrapOperand("-5")).toBe("(-5)");
    expect(wrapOperand("(2*3)")).toBe("((2*3))");
  });
});

describe("appendDigit", () => {
  it("appends a digit", () => {
    expect(appendDigit("", "1")).toBe("1");
    expect(appendDigit("12", "3")).toBe("123");
  });
});

describe("appendDecimalPoint", () => {
  it("prepends 0. for an empty expression", () => {
    expect(appendDecimalPoint("")).toBe("0.");
  });

  it("prepends 0. after an operator", () => {
    expect(appendDecimalPoint("3+")).toBe("3+0.");
    expect(appendDecimalPoint("(")).toBe("(0.");
  });

  it("appends . to a leading digit", () => {
    expect(appendDecimalPoint("5")).toBe("5.");
  });
});

describe("applySqrt", () => {
  it("wraps the operand and raises to 0.5", () => {
    expect(applySqrt("5")).toBe("(5)^0.5");
    expect(applySqrt("3+4")).toBe("(3+4)^0.5");
  });
});

describe("applyPercent", () => {
  it("wraps the operand and divides by 100", () => {
    expect(applyPercent("5")).toBe("(5)/100");
    expect(applyPercent("3+4")).toBe("(3+4)/100");
  });
});

describe("applyToggleSign", () => {
  it("negates plain numbers bare", () => {
    expect(applyToggleSign("5", false)).toBe("-5");
    expect(applyToggleSign("3.14", false)).toBe("-3.14");
  });

  it("parenthesizes grouped or compound operands", () => {
    expect(applyToggleSign("3+4", true)).toBe("-(3+4)");
    expect(applyToggleSign("3+4", false)).toBe("-(3+4)");
  });
});

describe("splitLastOperand", () => {
  it("returns null for empty expression", () => {
    expect(splitLastOperand("")).toBeNull();
  });

  it("splits a trailing number", () => {
    expect(splitLastOperand("3+4")).toEqual({ prefix: "3+", operand: "4", grouped: false });
  });

  it("splits a trailing decimal number", () => {
    expect(splitLastOperand("3.14")).toEqual({ prefix: "", operand: "3.14", grouped: false });
  });

  it("splits a trailing parenthesized group", () => {
    expect(splitLastOperand("(3+4)")).toEqual({ prefix: "", operand: "3+4", grouped: true });
    expect(splitLastOperand("2*(3+4)")).toEqual({
      prefix: "2*",
      operand: "3+4",
      grouped: true,
    });
  });

  it("disambiguates a bare leading dot", () => {
    expect(splitLastOperand(".5")).toEqual({ prefix: "", operand: "0.5", grouped: false });
  });

  it("returns null for an unmatched closing paren", () => {
    expect(splitLastOperand(")")).toBeNull();
    expect(splitLastOperand("1)")).toBeNull();
  });
});

describe("toggleSignExpression", () => {
  it("negates a leading plain number", () => {
    expect(toggleSignExpression("5")).toBe("-5");
  });

  it("toggles off an existing negation", () => {
    expect(toggleSignExpression("-5")).toBe("5");
  });

  it("negates a grouped operand", () => {
    expect(toggleSignExpression("(3+4)")).toBe("-(3+4)");
    expect(toggleSignExpression("-(3+4)")).toBe("(3+4)");
  });

  it("returns the expression unchanged when there is no operand", () => {
    expect(toggleSignExpression("3+")).toBe("3+");
  });
});
