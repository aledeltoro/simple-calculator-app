import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculate } from "./client";

const API_BASE_URL = "http://localhost:3000";
const ENDPOINT = `${API_BASE_URL}/api/v1/calculations`;

/** Minimal Response stand-in exposing only what the client uses. */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("calculate", () => {
  it("POSTs to the correct endpoint with the expression body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { result: 42 }));

    await calculate("2 + 2");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse((init.body ?? "") as string)).toEqual({
      expression: "2 + 2",
    });
  });

  it("resolves `success` with the numeric result on a 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { result: 18.2 }));

    await expect(calculate("2 + 3 * 5 + (12 / 10)")).resolves.toEqual({
      kind: "success",
      result: 18.2,
    });
  });

  it("resolves `bad_request` and surfaces the server message verbatim", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(400, {
        code: "bad_request",
        message: "division by zero not allowed",
      }),
    );

    await expect(calculate("1 / 0")).resolves.toEqual({
      kind: "bad_request",
      message: "division by zero not allowed",
    });
  });

  it("resolves `bad_request` with a fallback message when the body lacks one", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(400, { code: "bad_request" }));

    await expect(calculate("2 + 2")).resolves.toEqual({
      kind: "bad_request",
      message: "Invalid request",
    });
  });

  it("resolves `server` on a 500 error", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(500, {
        code: "internal_service_error",
        message: "Internal server error",
      }),
    );

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "server" });
  });

  it("resolves `server` when a 200 body is malformed/non-JSON", async () => {
    const response = {
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
    } as unknown as Response;
    mockFetch.mockResolvedValueOnce(response);

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "server" });
  });

  it("resolves `server` when a 200 body lacks a numeric result", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { unexpected: true }));

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "server" });
  });

  it("resolves `network` when fetch rejects with a TypeError", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "network" });
  });

  it("resolves `network` when fetch rejects with a non-Error value", async () => {
    mockFetch.mockRejectedValueOnce(null);

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "network" });
  });

  it("falls back to the internal timeout signal when AbortSignal.any is unavailable", async () => {
    // jsdom does not implement `AbortSignal.any`, so an external signal takes
    // the fallback branch (return the standalone timeout signal).
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { result: 1 }));
    const controller = new AbortController();

    await calculate("1 + 1", { signal: controller.signal });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeDefined();
    expect(init.signal).not.toBe(controller.signal);
  });

  it("merges an external signal via AbortSignal.any when available", async () => {
    const anySpy = vi.fn((signals: AbortSignal[]) => signals[0] ?? signals[1]);
    const originalAny = AbortSignal.any;
    // @ts-expect-error — override to exercise the modern-runtime merge branch
    AbortSignal.any = anySpy;

    try {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { result: 1 }));
      const controller = new AbortController();

      await calculate("1 + 1", { signal: controller.signal });

      expect(anySpy).toHaveBeenCalledTimes(1);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBeDefined();
    } finally {
      AbortSignal.any = originalAny;
    }
  });

  it("resolves `timeout` when fetch rejects with a TimeoutError", async () => {
    const error = new Error("The operation was aborted due to timeout");
    error.name = "TimeoutError";
    mockFetch.mockRejectedValueOnce(error);

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "timeout" });
  });

  it("resolves `timeout` when fetch rejects with an AbortError", async () => {
    const error = new Error("This operation was aborted");
    error.name = "AbortError";
    mockFetch.mockRejectedValueOnce(error);

    await expect(calculate("2 + 2")).resolves.toEqual({ kind: "timeout" });
  });
});
