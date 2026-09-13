import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculate } from "../api/client";
import { SQRT_NEGATIVE_MESSAGE } from "../calculator/reducer";
import App from "./App";

// Mock the API client so `=` never hits the network (SPEC layering strategy).
vi.mock("../api/client", () => ({
  calculate: vi.fn(),
}));

const mockCalculate = vi.mocked(calculate);

beforeEach(() => {
  mockCalculate.mockReset();
});

describe("App", () => {
  it("renders the display with initial value 0", () => {
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("0");
  });

  it("updates the display when digit buttons are clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "3" }));

    expect(screen.getByRole("status")).toHaveTextContent("23");
  });

  it("appends an operator after a digit", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "add" }));

    expect(screen.getByRole("status")).toHaveTextContent("2+");
  });

  it("evaluates 2×3 to 6 on equals", async () => {
    mockCalculate.mockResolvedValue({ kind: "success", result: 6 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "multiply" }));
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "equals" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("6"));
    expect(mockCalculate).toHaveBeenCalledWith(
      "2*3",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("surfaces a bad_request error in the alert banner", async () => {
    mockCalculate.mockResolvedValue({
      kind: "bad_request",
      message: "division by zero not allowed",
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "divide" }));
    await user.click(screen.getByRole("button", { name: "0" }));
    await user.click(screen.getByRole("button", { name: "equals" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("division by zero not allowed");
  });

  it("clears the display back to 0", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "clear" }));

    expect(screen.getByRole("status")).toHaveTextContent("0");
  });

  it("shows a friendly sqrt symbol while sending the backend form", async () => {
    mockCalculate.mockResolvedValue({ kind: "success", result: 3 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "9" }));
    await user.click(screen.getByRole("button", { name: "square root" }));

    expect(screen.getByRole("status")).toHaveTextContent("√9");

    await user.click(screen.getByRole("button", { name: "equals" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("3"));
    expect(mockCalculate).toHaveBeenCalledWith(
      "(9)^0.5",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("shows a friendly percent symbol while sending the backend form", async () => {
    mockCalculate.mockResolvedValue({ kind: "success", result: 0.5 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "0" }));
    await user.click(screen.getByRole("button", { name: "percent" }));

    expect(screen.getByRole("status")).toHaveTextContent("50%");

    await user.click(screen.getByRole("button", { name: "equals" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0.5"));
    expect(mockCalculate).toHaveBeenCalledWith(
      "(50)/100",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("shows the exponent key and sends the backend `^` form", async () => {
    mockCalculate.mockResolvedValue({ kind: "success", result: 8 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "exponent" }));
    await user.click(screen.getByRole("button", { name: "3" }));

    expect(screen.getByRole("status")).toHaveTextContent("2^3");

    await user.click(screen.getByRole("button", { name: "equals" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("8"));
    expect(mockCalculate).toHaveBeenCalledWith(
      "2^3",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("applies sqrt to an evaluated result and sends (6)^0.5", async () => {
    mockCalculate
      .mockResolvedValueOnce({ kind: "success", result: 6 })
      .mockResolvedValueOnce({ kind: "success", result: 2.449489742783178 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "multiply" }));
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("6"));

    await user.click(screen.getByRole("button", { name: "square root" }));
    expect(screen.getByRole("status")).toHaveTextContent("√6");

    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("2.44948974278"),
    );
    expect(mockCalculate).toHaveBeenCalledWith(
      "(6)^0.5",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("negates an evaluated result and sends -5", async () => {
    mockCalculate
      .mockResolvedValueOnce({ kind: "success", result: 5 })
      .mockResolvedValueOnce({ kind: "success", result: -5 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("5"));

    await user.click(screen.getByRole("button", { name: "negate" }));
    expect(screen.getByRole("status")).toHaveTextContent("−5");

    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("-5"));
    expect(mockCalculate).toHaveBeenCalledWith(
      "-5",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("applies percent to an evaluated result and sends (7)/100", async () => {
    mockCalculate
      .mockResolvedValueOnce({ kind: "success", result: 7 })
      .mockResolvedValueOnce({ kind: "success", result: 0.07 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("7"));

    await user.click(screen.getByRole("button", { name: "percent" }));
    expect(screen.getByRole("status")).toHaveTextContent("7%");

    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0.07"));
    expect(mockCalculate).toHaveBeenCalledWith(
      "(7)/100",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects sqrt on a negative result client-side without calling the API", async () => {
    mockCalculate.mockResolvedValue({ kind: "success", result: -2 });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "subtract" }));
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "equals" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("-2"));
    expect(mockCalculate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "square root" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SQRT_NEGATIVE_MESSAGE);
    expect(mockCalculate).toHaveBeenCalledTimes(1);
  });
});
