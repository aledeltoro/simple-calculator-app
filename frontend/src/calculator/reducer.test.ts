import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./reducer";
import type { CalculatorState } from "./reducer";

function reduce(actions: Parameters<typeof reducer>[1][]): CalculatorState {
  return actions.reduce(reducer, initialState);
}

describe("reducer", () => {
  it("starts idle with a 0 display", () => {
    expect(initialState).toEqual({
      expression: "",
      display: "0",
      result: null,
      error: null,
      status: "idle",
    });
  });

  it("appends digits", () => {
    const state = reduce([
      { type: "append", token: "4" },
      { type: "append", token: "2" },
    ]);
    expect(state).toMatchObject({ expression: "42", display: "42", status: "idle" });
  });

  it("maps operators to backend symbols", () => {
    const state = reduce([
      { type: "append", token: "2" },
      { type: "append", token: "×" },
      { type: "append", token: "3" },
    ]);
    expect(state.expression).toBe("2*3");
    expect(state.display).toBe("2×3");
  });

  it("maps the exponent operator to the backend `^` symbol", () => {
    const state = reduce([
      { type: "append", token: "2" },
      { type: "append", token: "xʸ" },
      { type: "append", token: "3" },
    ]);
    expect(state.expression).toBe("2^3");
    expect(state.display).toBe("2^3");
  });

  it("chains the exponent operator onto a success result", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);
    const chained = reducer(success, { type: "append", token: "xʸ" });
    expect(chained.status).toBe("idle");
    expect(chained.expression).toBe("6^");
  });

  it("disambiguates a leading decimal point", () => {
    const state = reduce([{ type: "append", token: "." }]);
    expect(state.expression).toBe("0.");
  });

  it("applies sqrt to the last operand", () => {
    const state = reduce([
      { type: "append", token: "9" },
      { type: "sqrt" },
    ]);
    expect(state.expression).toBe("(9)^0.5");
    expect(state.display).toBe("√9");
  });

  it("applies percent to the last operand", () => {
    const state = reduce([
      { type: "append", token: "5" },
      { type: "append", token: "0" },
      { type: "percent" },
    ]);
    expect(state.expression).toBe("(50)/100");
    expect(state.display).toBe("50%");
  });

  it("toggles the sign of the last operand", () => {
    const state = reduce([
      { type: "append", token: "5" },
      { type: "toggleSign" },
    ]);
    expect(state.expression).toBe("-5");

    const next = reducer(state, { type: "toggleSign" });
    expect(next.expression).toBe("5");
  });

  it("backspaces the last character", () => {
    const state = reduce([
      { type: "append", token: "1" },
      { type: "append", token: "2" },
      { type: "backspace" },
    ]);
    expect(state.expression).toBe("1");
    expect(state.display).toBe("1");

    const empty = reducer(state, { type: "backspace" });
    expect(empty.display).toBe("0");
  });

  it("clears to the initial state", () => {
    const state = reduce([
      { type: "append", token: "1" },
      { type: "clear" },
    ]);
    expect(state).toEqual(initialState);
  });

  it("evaluates to a success result and formats the display", () => {
    const evaluating = reduce([
      { type: "append", token: "2" },
      { type: "append", token: "×" },
      { type: "append", token: "3" },
      { type: "evaluate" },
    ]);
    expect(evaluating.status).toBe("evaluating");

    const success = reducer(evaluating, { type: "success", result: 6 });
    expect(success).toMatchObject({
      status: "success",
      result: 6,
      display: "6",
      expression: "6",
      error: null,
    });
  });

  it("chains a subsequent operator onto a success result", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);
    const chained = reducer(success, { type: "append", token: "+" });
    expect(chained.status).toBe("idle");
    expect(chained.expression).toBe("6+");
  });

  it("starts a fresh expression when a digit follows a success", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);
    const fresh = reducer(success, { type: "append", token: "1" });
    expect(fresh.expression).toBe("1");
  });

  it("records failures and resets on a subsequent append", () => {
    const evaluating = reduce([
      { type: "append", token: "1" },
      { type: "evaluate" },
    ]);
    const failed = reducer(evaluating, {
      type: "failure",
      message: "division by zero not allowed",
    });
    expect(failed).toMatchObject({
      status: "error",
      error: "division by zero not allowed",
    });

    const resumed = reducer(failed, { type: "append", token: "7" });
    expect(resumed.expression).toBe("7");
    expect(resumed.status).toBe("idle");
    expect(resumed.error).toBeNull();
  });

  it("ignores evaluating duplicates", () => {
    const evaluating = reduce([{ type: "evaluate" }]);
    expect(reducer(evaluating, { type: "evaluate" }).status).toBe("evaluating");
  });

  it("applies sqrt to a success result", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);

    const next = reducer(success, { type: "sqrt" });
    expect(next).toMatchObject({
      expression: "(6)^0.5",
      display: "√6",
      status: "idle",
      result: null,
      error: null,
    });
  });

  it("applies percent to a success result", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);

    const next = reducer(success, { type: "percent" });
    expect(next).toMatchObject({
      expression: "(6)/100",
      display: "6%",
      status: "idle",
      result: null,
    });
  });

  it("toggles the sign of a success result and back", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);

    const negated = reducer(success, { type: "toggleSign" });
    expect(negated).toMatchObject({
      expression: "-6",
      display: "−6",
      status: "idle",
      result: null,
    });

    const restored = reducer(negated, { type: "toggleSign" });
    expect(restored).toMatchObject({
      expression: "6",
      display: "6",
      status: "idle",
      result: null,
    });
  });

  it("ignores toggleSign/sqrt/percent while evaluating", () => {
    const evaluatingReduced = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
    ]);

    expect(reducer(evaluatingReduced, { type: "toggleSign" })).toBe(evaluatingReduced);
    expect(reducer(evaluatingReduced, { type: "sqrt" })).toBe(evaluatingReduced);
    expect(reducer(evaluatingReduced, { type: "percent" })).toBe(evaluatingReduced);
  });

  it("ignores toggleSign/sqrt/percent on error", () => {
    const errored = reduce([
      { type: "append", token: "1" },
      { type: "evaluate" },
      { type: "failure", message: "division by zero not allowed" },
    ]);

    expect(reducer(errored, { type: "toggleSign" })).toBe(errored);
    expect(reducer(errored, { type: "sqrt" })).toBe(errored);
    expect(reducer(errored, { type: "percent" })).toBe(errored);
  });

  it("stores the formatted decimal expression on success", () => {
    const evaluating = reduce([{ type: "evaluate" }]);
    const success = reducer(evaluating, {
      type: "success",
      result: 0.30000000000000004,
    });
    expect(success.expression).toBe("0.3");
    expect(success.display).toBe("0.3");

    const sqrt = reducer(success, { type: "sqrt" });
    expect(sqrt.expression).toBe("(0.3)^0.5");
  });

  it("ignores toggleSign/sqrt/percent when there is no trailing operand", () => {
    expect(reducer(initialState, { type: "toggleSign" })).toBe(initialState);
    expect(reducer(initialState, { type: "sqrt" })).toBe(initialState);
    expect(reducer(initialState, { type: "percent" })).toBe(initialState);
  });

  it("resets to the initial state when backspacing after a result", () => {
    const success = reduce([
      { type: "append", token: "6" },
      { type: "evaluate" },
      { type: "success", result: 6 },
    ]);

    expect(reducer(success, { type: "backspace" })).toEqual(initialState);
  });
});
