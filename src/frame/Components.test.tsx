// @vitest-environment jsdom
import { afterEach, it, expect } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import {
  ProductCard,
  InventoryTable,
  PeopleList,
  Empty,
  ErrorState,
} from "./Components";
import { defaultConfig, fixture } from "../lib/fixtures";
afterEach(cleanup);
it("lets a visitor add and remove an available product in the demo bag", () => {
  render(<ProductCard config={defaultConfig()} />);
  fireEvent.click(screen.getByRole("button", { name: /Add to bag/ }));
  expect(
    screen.getByText("Demo bag updated. No order was placed."),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /remove from bag/ }));
  expect(screen.getByRole("button", { name: /Add to bag/ })).toBeTruthy();
});
it("uses missing-data fallbacks and disables unavailable commerce actions", () => {
  const c = defaultConfig();
  c.data = fixture("missing");
  render(<ProductCard config={c} />);
  expect(
    screen.getByRole("heading", { name: "Untitled product" }),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: /Pricing unavailable/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByText("Image unavailable")).toBeTruthy();
});
it("falls back when a product image fails to load", () => {
  render(<ProductCard config={defaultConfig()} />);
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText("Image unavailable")).toBeTruthy();
});
it("filters inventory, recovers from no search results, and selects rows", () => {
  render(<InventoryTable config={defaultConfig()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Search inventory" }), {
    target: { value: "does-not-exist" },
  });
  expect(
    screen.getByRole("heading", { name: "No matching products" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Select The Everyday Chair" }),
  );
  expect(screen.getByText("1 selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(screen.getByText("0 selected")).toBeTruthy();
});
it("sorts inventory in both directions", () => {
  render(<InventoryTable config={defaultConfig()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Sort products descending" }),
  );
  const rows = screen.getAllByRole("row");
  expect(rows[1].textContent).toContain("The Everyday Chair");
  fireEvent.click(
    screen.getByRole("button", { name: "Sort products ascending" }),
  );
  expect(screen.getAllByRole("row")[1].textContent).toContain("Arc Table Lamp");
});
it("follows people locally and provides usable name fallbacks", () => {
  const c = defaultConfig();
  c.data = fixture("missing");
  render(<PeopleList config={c} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Follow" })[0]);
  expect(
    screen
      .getByRole("button", { name: "Following" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen.getAllByRole("heading", { name: "Name unavailable" }),
  ).toHaveLength(4);
});
it("wires recovery actions and labels real and simulated errors honestly", () => {
  let count = 0;
  const { rerender } = render(<Empty kind="product" onReset={() => count++} />);
  fireEvent.click(screen.getByRole("button", { name: /Restore sample data/ }));
  expect(count).toBe(1);
  rerender(<ErrorState live onRetry={() => count++} />);
  expect(
    screen.getByText("Live request failed · previous data preserved"),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(count).toBe(2);
});
