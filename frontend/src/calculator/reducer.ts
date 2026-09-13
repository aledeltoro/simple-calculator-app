/**
 * Pure calculator state machine.
 *
 * This reducer performs no I/O. The `useCalculator` hook drives the async
 * `evaluate` → `success`/`failure` lifecycle (request-id sequencing, aborting)
 * around this reducer.
 *
 * Boundary rule: `calculator/` imports nothing from React, `api/`, or `hooks/`.
 */

import { formatResult } from "./formatters";
import {
  appendDecimalPoint,
  applyPercent,
  applySqrt,
  mapOperator,
  splitLastOperand,
  toggleSignExpression,
} from "./transform";
import type { ButtonToken, OperatorToken } from "./transform";

export type CalculatorStatus = "idle" | "evaluating" | "success" | "error";

export interface CalculatorState {
  /** Backend-compatible expression string. */
  expression: string;
  /** Human-readable display (the expression, or the formatted result). */
  display: string;
  result: number | null;
  error: string | null;
  status: CalculatorStatus;
}

export const initialState: CalculatorState = {
  expression: "",
  display: "0",
  result: null,
  error: null,
  status: "idle",
};

export type CalculatorAction =
  | { type: "append"; token: ButtonToken }
  | { type: "toggleSign" }
  | { type: "sqrt" }
  | { type: "percent" }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "evaluate" }
  | { type: "success"; result: number }
  | { type: "failure"; message: string };

function isOperatorToken(token: ButtonToken): token is OperatorToken {
  return token === "+" || token === "−" || token === "×" || token === "÷";
}

/** After a successful evaluation, an operator chains onto the result, while
 * any other key starts a fresh expression. */
function baseExpressionAfterResult(state: CalculatorState, token: ButtonToken): string {
  if (state.status === "success" && isOperatorToken(token)) {
    return state.expression;
  }
  return "";
}

export function reducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case "clear":
      return initialState;

    case "append": {
      let expression: string;
      if (state.status === "success") {
        expression = baseExpressionAfterResult(state, action.token);
      } else if (state.status === "error") {
        expression = "";
      } else {
        expression = state.expression;
      }

      if (action.token === ".") {
        expression = appendDecimalPoint(expression);
      } else if (isOperatorToken(action.token)) {
        expression = `${expression}${mapOperator(action.token)}`;
      } else {
        expression = `${expression}${action.token}`;
      }

      return {
        expression,
        display: expression || "0",
        result: null,
        error: null,
        status: "idle",
      };
    }

    case "toggleSign":
    case "sqrt":
    case "percent": {
      if (state.status !== "idle") {
        return state;
      }
      const last = splitLastOperand(state.expression);
      if (last === null) {
        return state;
      }

      let expression: string;
      if (action.type === "toggleSign") {
        expression = toggleSignExpression(state.expression);
      } else if (action.type === "sqrt") {
        expression = `${last.prefix}${applySqrt(last.operand)}`;
      } else {
        expression = `${last.prefix}${applyPercent(last.operand)}`;
      }

      return {
        ...state,
        expression,
        display: expression || "0",
        result: null,
      };
    }

    case "backspace": {
      if (state.status !== "idle") {
        return { ...initialState };
      }
      const expression = state.expression.slice(0, -1);
      return {
        ...state,
        expression,
        display: expression || "0",
        result: null,
        error: null,
      };
    }

    case "evaluate": {
      if (state.status === "evaluating") {
        return state;
      }
      return { ...state, status: "evaluating", error: null };
    }

    case "success": {
      return {
        expression: String(action.result),
        display: formatResult(action.result),
        result: action.result,
        error: null,
        status: "success",
      };
    }

    case "failure": {
      return { ...state, status: "error", error: action.message };
    }
  }
}
