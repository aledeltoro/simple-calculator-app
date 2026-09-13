/**
 * `useCalculator` — the meeting point of the `calculator/` and `api/` layers.
 *
 * The reducer is pure (no I/O); this hook owns the asynchronous side-effect and
 * its race-safety guarantees:
 *   - client-side pre-validation via `validateExpression` (fast UX, no API hit);
 *   - a monotonically increasing request-id sequence so only the LATEST
 *     evaluation may update state (rapid `=` presses drop stale responses);
 *   - an `AbortController` ref so a newer evaluation aborts the in-flight one;
 *   - abort-on-unmount via `useEffect` cleanup.
 *
 * Boundary rule: `hooks/` is the only layer allowed to import from both
 * `calculator/` and `api/`.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Dispatch } from "react";
import { calculate } from "../api/client";
import type { ApiResult } from "../api/types";
import { initialState, reducer } from "../calculator/reducer";
import type { CalculatorAction, CalculatorState } from "../calculator/reducer";
import { validateExpression } from "../calculator/validation";
import type { ButtonToken } from "../calculator/transform";

/**
 * User-facing messages mapped from the non-domain `ApiResult` variants.
 * Domain (`bad_request`) messages are surfaced verbatim from the server.
 */
export const ERROR_MESSAGES = {
  /** `ApiResult["kind"] === "server"` */
  server: "Internal server error",
  /** `ApiResult["kind"] === "network"` (fetch rejected with a TypeError). */
  network: "network error",
  /** `ApiResult["kind"] === "timeout"` (fetch aborted/timed out). */
  timeout: "request timed out",
} as const;

/** Fallback when a validation failure lacks a message (defensive only). */
const FALLBACK_VALIDATION_MESSAGE = "invalid expression";

/** Shape of the value returned by `useCalculator`. */
export interface UseCalculator {
  /** Current calculator state (expression, display, result, error, status). */
  state: CalculatorState;
  /** Raw reducer dispatch (useful for the component layer). */
  dispatch: Dispatch<CalculatorAction>;
  /** Validate + evaluate the current expression against the backend. */
  evaluate: () => void;
  /** Thin `dispatch` wrappers for keypad interactions. */
  append: (token: ButtonToken) => void;
  toggleSign: () => void;
  sqrt: () => void;
  percent: () => void;
  backspace: () => void;
  clear: () => void;
}

/**
 * Map a resolved `ApiResult` to a reducer action.
 * Domain (`bad_request`) messages are forwarded verbatim; the remaining
 * transport variants use the fixed messages in `ERROR_MESSAGES`.
 */
function actionForResult(result: ApiResult): CalculatorAction {
  switch (result.kind) {
    case "success":
      return { type: "success", result: result.result };
    case "bad_request":
      return { type: "failure", message: result.message };
    case "server":
      return { type: "failure", message: ERROR_MESSAGES.server };
    case "network":
      return { type: "failure", message: ERROR_MESSAGES.network };
    case "timeout":
      return { type: "failure", message: ERROR_MESSAGES.timeout };
  }
}

/**
 * Wire the pure reducer to the API client with race safety.
 */
export function useCalculator(): UseCalculator {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Monotonic sequence; only the latest id may mutate state. */
  const requestIdRef = useRef(0);
  /** In-flight request; aborted when superseded or on unmount. */
  const abortControllerRef = useRef<AbortController | null>(null);

  const evaluate = useCallback((): void => {
    // Reducer already guards the evaluating→evaluating transition; guard here
    // too so we never issue a duplicate API call while a request is in flight.
    if (state.status === "evaluating") {
      return;
    }

    const validation = validateExpression(state.expression);
    if (!validation.valid) {
      dispatch({
        type: "failure",
        message: validation.message ?? FALLBACK_VALIDATION_MESSAGE,
      });
      return;
    }

    // Supersede any in-flight request before starting a new one.
    abortControllerRef.current?.abort();
    dispatch({ type: "evaluate" });

    const id = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    calculate(state.expression, { signal: controller.signal })
      .then((result) => {
        // A newer evaluation owns the state now — drop this stale response.
        if (id !== requestIdRef.current) {
          return;
        }
        abortControllerRef.current = null;
        dispatch(actionForResult(result));
      })
      .catch(() => {
        // `calculate` resolves ordinary failures via the union; a rejection
        // here is an unexpected condition. Only apply it if still latest.
        if (id !== requestIdRef.current) {
          return;
        }
        abortControllerRef.current = null;
        dispatch({ type: "failure", message: ERROR_MESSAGES.server });
      });
  }, [state.expression, state.status]);

  // Abort any in-flight request when the hook unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const append = useCallback(
    (token: ButtonToken): void => dispatch({ type: "append", token }),
    [dispatch],
  );
  const toggleSign = useCallback((): void => dispatch({ type: "toggleSign" }), [dispatch]);
  const sqrt = useCallback((): void => dispatch({ type: "sqrt" }), [dispatch]);
  const percent = useCallback((): void => dispatch({ type: "percent" }), [dispatch]);
  const backspace = useCallback((): void => dispatch({ type: "backspace" }), [dispatch]);
  const clear = useCallback((): void => dispatch({ type: "clear" }), [dispatch]);

  return {
    state,
    dispatch,
    evaluate,
    append,
    toggleSign,
    sqrt,
    percent,
    backspace,
    clear,
  };
}
