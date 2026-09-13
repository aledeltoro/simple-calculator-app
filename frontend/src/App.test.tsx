import { describe, expect, it } from "vitest";
import DefaultApp from "./App";
import ComponentApp from "./components/App";

describe("App re-export", () => {
  it("re-exports components/App as the default export", () => {
    expect(DefaultApp).toBe(ComponentApp);
  });
});
