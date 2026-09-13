import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculate } from "../api/client";
import type { ApiResult } from "../api/types";
import { useCalculator } from "./useCalculator";

// Mock the API client module per the SPEC layering/test strategy.
vi.mock("../api/client", () => ({
  calculate: vi.fn(),
}));

const mockCalculate = vi.mocked(calculate);

/** Controllable promise for deterministic race/abort tests. */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Type a captured AbortSignal from a `calculate` options arg. */
function lastSignal(): AbortSignal | undefined {
  const call = mockCalculate.mock.calls[mockCalculate.mock.calls.length - 1];
  return call?.[1]?.signal;
}

beforeEach(() => {
  mockCalculate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCalculator", () => {
  it("dispatches `success` and reflects formatted result for a valid expression", async () => {
    mockCalculate.mockResolvedValue({ kind: "success", result: 42 });

    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.append("4");
      result.current.append("2");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(mockCalculate).toHaveBeenCalledTimes(1);
    expect(mockCalculate).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.state.status).toBe("success");
    expect(result.current.state.result).toBe(42);
    expect(result.current.state.display).toBe("42");
    expect(result.current.state.error).toBeNull();
  });

  it("dispatches `failure` without calling the API for an empty expression", async () => {
    const { result } = renderHook(() => useCalculator());

    await act(async () => {
      result.current.evaluate();
    });

    expect(mockCalculate).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("empty expression");
  });

  it("dispatches `failure` without calling the API for a trailing operator", async () => {
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.append("2");
      result.current.append("+");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(mockCalculate).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("expression parsing failed");
  });

  it("surfaces the server message verbatim on `bad_request`", async () => {
    mockCalculate.mockResolvedValue({
      kind: "bad_request",
      message: "division by zero not allowed",
    });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("1");
      result.current.append("÷");
      result.current.append("0");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("division by zero not allowed");
  });

  it("dispatches the fixed server message on `server`", async () => {
    mockCalculate.mockResolvedValue({ kind: "server" });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("2");
      result.current.append("+");
      result.current.append("2");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("Internal server error");
  });

  it("dispatches the network message on `network`", async () => {
    mockCalculate.mockResolvedValue({ kind: "network" });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("2");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("network error");
  });

  it("dispatches the timeout message on `timeout`", async () => {
    mockCalculate.mockResolvedValue({ kind: "timeout" });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("2");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("request timed out");
  });

  it("applies only the latest evaluation result when the first resolves after the second", async () => {
    const first = deferred<ApiResult>();
    const second = deferred<ApiResult>();
    mockCalculate
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.append("1");
    });
    act(() => {
      result.current.evaluate();
    });
    act(() => {
      result.current.clear();
    });
    act(() => {
      result.current.append("2");
    });
    act(() => {
      result.current.evaluate();
    });

    // The second evaluation resolves first and wins.
    await act(async () => {
      second.resolve({ kind: "success", result: 2 });
    });
    expect(result.current.state.result).toBe(2);
    expect(result.current.state.display).toBe("2");

    // The stale first response resolves later and must be ignored.
    await act(async () => {
      first.resolve({ kind: "success", result: 1 });
    });
    expect(result.current.state.result).toBe(2);
    expect(result.current.state.display).toBe("2");
  });

  it("aborts the previous request signal when a new evaluation starts", async () => {
    const never = new Promise<ApiResult>(() => {});
    mockCalculate.mockImplementation(() => never);

    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.append("1");
    });
    act(() => {
      result.current.evaluate();
    });
    const firstSignal = lastSignal();
    expect(firstSignal?.aborted).toBe(false);

    act(() => {
      result.current.clear();
    });
    act(() => {
      result.current.append("2");
    });
    act(() => {
      result.current.evaluate();
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(lastSignal()?.aborted).toBe(false);
  });

  it("does not issue a duplicate API call while already evaluating", async () => {
    mockCalculate.mockImplementation(() => new Promise<ApiResult>(() => {}));

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("1");
    });
    act(() => {
      result.current.evaluate();
    });
    act(() => {
      result.current.evaluate();
    });

    expect(mockCalculate).toHaveBeenCalledTimes(1);
  });

  it("maps an unexpected rejection to the server failure message", async () => {
    mockCalculate.mockRejectedValue(new Error("unexpected"));

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("2");
    });
    await act(async () => {
      result.current.evaluate();
    });

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("Internal server error");
  });

  it("ignores a stale rejection when a newer evaluation supersedes it", async () => {
    const first = deferred<ApiResult>();
    const second = deferred<ApiResult>();
    mockCalculate
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("1");
    });
    act(() => {
      result.current.evaluate();
    });
    act(() => {
      result.current.clear();
    });
    act(() => {
      result.current.append("2");
    });
    act(() => {
      result.current.evaluate();
    });

    // The stale first request rejects after being superseded — must be ignored.
    await act(async () => {
      first.reject(new Error("stale"));
    });
    expect(result.current.state.status).toBe("evaluating");

    await act(async () => {
      second.resolve({ kind: "success", result: 2 });
    });
    expect(result.current.state.result).toBe(2);
    expect(result.current.state.status).toBe("success");
  });

  it("aborts an in-flight request on unmount", () => {
    mockCalculate.mockImplementation(() => new Promise<ApiResult>(() => {}));

    const { result, unmount } = renderHook(() => useCalculator());
    act(() => {
      result.current.append("1");
    });
    act(() => {
      result.current.evaluate();
    });
    const signal = lastSignal();
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
