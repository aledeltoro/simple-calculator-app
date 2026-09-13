import { describe, expect, it } from "vitest";
import { validateExpression } from "./validation";

describe("validateExpression", () => {
  it("accepts well-formed expressions", () => {
    expect(validateExpression("2+3")).toEqual({ valid: true, message: null });
    expect(validateExpression("2 + 3 * 5 + (12 / 10)")).toEqual({
      valid: true,
      message: null,
    });
    expect(validateExpression("-5")).toEqual({ valid: true, message: null });
    expect(validateExpression("(2)^0.5")).toEqual({ valid: true, message: null });
  });

  it("rejects empty or whitespace-only expressions", () => {
    expect(validateExpression("")).toEqual({
      valid: false,
      message: "empty expression",
    });
    expect(validateExpression("   ")).toEqual({
      valid: false,
      message: "empty expression",
    });
  });

  it("rejects invalid characters", () => {
    expect(validateExpression("2a+3")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
    expect(validateExpression("2%3")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
  });

  it("rejects unbalanced parentheses", () => {
    expect(validateExpression("(2+3")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
    expect(validateExpression("2+3)")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
  });

  it("rejects trailing operators", () => {
    expect(validateExpression("2+")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
    expect(validateExpression("2*")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
  });

  it("rejects a leading binary operator (but allows unary minus)", () => {
    expect(validateExpression("+5")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
    expect(validateExpression("*5")).toEqual({
      valid: false,
      message: "expression parsing failed",
    });
    expect(validateExpression("-5").valid).toBe(true);
  });
});
