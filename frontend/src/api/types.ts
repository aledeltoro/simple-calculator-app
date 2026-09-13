/**
 * API contract types for the calculator backend.
 *
 * Boundary rule: `api/` imports nothing from React or `calculator/`.
 */

export interface CalculateRequest {
  expression: string;
}

export interface CalculateSuccessResponse {
  result: number;
}

/**
 * Error envelope returned by the backend on non-2xx responses, e.g.
 * `{"code":"bad_request","message":"division by zero not allowed"}` or
 * `{"code":"internal_service_error","message":"Internal server error"}`.
 */
export interface CalculateErrorResponse {
  code: string;
  message: string;
}

export type ApiError = CalculateErrorResponse;

/**
 * Discriminated union describing every outcome of a `calculate` call.
 * The client resolves to one of these instead of throwing on ordinary
 * failures (network, timeout, HTTP errors, bad input).
 */
export type ApiResult =
  | { kind: "success"; result: number }
  | { kind: "bad_request"; message: string }
  | { kind: "server" }
  | { kind: "network" }
  | { kind: "timeout" };
