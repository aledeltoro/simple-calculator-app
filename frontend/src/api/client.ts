import { API_BASE_URL } from "../config";
import type { ApiResult, CalculateErrorResponse, CalculateSuccessResponse } from "./types";

const TIMEOUT_MS = 8000;
const CALCULATIONS_PATH = "/api/v1/calculations";

export interface CalculateOptions {
  /** Optional external signal merged with the internal 8s timeout. */
  signal?: AbortSignal;
}

function isAbortOrTimeoutError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

/** Build the abort signal, merging an external signal when possible. */
function buildSignal(external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  if (!external) {
    return timeout;
  }
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([timeout, external]);
  }
  return timeout;
}

/**
 * Parse a response body as JSON, returning `null` on malformed/non-JSON
 * bodies so callers can fall back defensively rather than throw.
 */
async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractMessage(body: unknown): string {
  if (body !== null && typeof body === "object") {
    const message = (body as CalculateErrorResponse).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "Invalid request";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Evaluates `expression` via the backend and returns a discriminated union
 * describing the outcome. Never throws for ordinary failures (network,
 * timeout, HTTP 4xx/5xx); only truly unexpected conditions could propagate.
 */
export async function calculate(
  expression: string,
  options: CalculateOptions = {},
): Promise<ApiResult> {
  const signal = buildSignal(options.signal);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${CALCULATIONS_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression }),
      signal,
    });
  } catch (error) {
    if (isAbortOrTimeoutError(error)) {
      return { kind: "timeout" };
    }
    // fetch rejects with a TypeError on network-level failures.
    return { kind: "network" };
  }

  const { status } = response;

  if (status >= 200 && status < 300) {
    const body = await safeParseJson(response);
    if (body !== null && typeof body === "object") {
      const result = (body as CalculateSuccessResponse).result;
      if (isNumber(result)) {
        return { kind: "success", result };
      }
    }
    // Malformed/non-JSON success body — treat defensively as a server error.
    return { kind: "server" };
  }

  if (status === 400) {
    const body = await safeParseJson(response);
    return { kind: "bad_request", message: extractMessage(body) };
  }

  // Any 5xx (or any other unexpected status) → server error.
  return { kind: "server" };
}
