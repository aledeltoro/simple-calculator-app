import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock `react-dom/client` so the entry-point wiring can be asserted without a
// full React render. `createRoot(...)` returns an object exposing `render`.
const { createRootMock, renderMock } = vi.hoisted(() => {
  const renderMock = vi.fn();
  const createRootMock = vi.fn(() => ({ render: renderMock }));
  return { createRootMock, renderMock };
});

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

describe("main entry point", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("creates a root and renders <App /> into #root", async () => {
    await import("./main");

    expect(createRootMock).toHaveBeenCalledWith(root);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
