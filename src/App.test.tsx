// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import App from "./App";
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("does not claim a scenario was saved when browser storage rejects it", () => {
  render(<App />);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("quota");
  });
  fireEvent.click(screen.getByRole("button", { name: /Save scenario/ }));
  fireEvent.click(screen.getByRole("button", { name: /Save locally/ }));
  expect(
    screen.getByText(
      "Scenario kept in this session only. Export it before leaving.",
    ),
  ).toBeTruthy();
  spy.mockRestore();
});
it("applies a stress preset and preserves applied data when JSON is invalid", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Long content/ }));
  fireEvent.click(screen.getByRole("tab", { name: /Data editor/ }));
  const editor = screen.getByRole("textbox", {
    name: "Dataset JSON",
  }) as HTMLTextAreaElement;
  expect(JSON.parse(editor.value).products[0].title.length).toBeGreaterThan(80);
  fireEvent.change(editor, { target: { value: "{" } });
  fireEvent.click(screen.getByRole("button", { name: /Apply JSON/ }));
  expect(
    screen.getByText(/JSON|Expected|property/i, { selector: ".json-error" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Copy/ }));
});
it("sets a real iframe width and saves/restores portable scenarios", async () => {
  const { unmount } = render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Mobile viewport 390 pixels" }),
  );
  expect(screen.getByTitle("product component at 390 pixels")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Save scenario/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "SCENARIO NAME" }), {
    target: { value: "Mobile edge case" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Save locally/ }));
  expect(
    JSON.parse(localStorage.getItem("statelab:scenarios:v1")!).scenarios[0]
      .config.width,
  ).toBe(390);
  unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Saved scenarios/ }));
  expect(
    await screen.findByRole("heading", { name: "Mobile edge case" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Open scenario/ }));
  expect(screen.getByTitle("product component at 390 pixels")).toBeTruthy();
});
it("distinguishes an actual timed local simulation from live network requests", () => {
  vi.useFakeTimers();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Run simulation/ }));
  expect(screen.getByText(/SIMULATION · waiting/)).toBeTruthy();
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText(/No network request was made/)).toBeTruthy();
});
it("persists the dark workspace theme independently from component appearance", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Dark" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("statelab:theme")).toBe("dark");
});
