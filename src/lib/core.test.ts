import { describe, it, expect, vi, afterEach } from "vitest";
import { configSchema, dataSchema, scenarioSchema } from "./model";
import { defaultConfig, fixture, presets } from "./fixtures";
import { loadScenarios, saveScenarios, parseImport } from "./storage";
import { observations } from "./diagnostics";
import { fetchProducts, generateCase } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("data and scenarios", () => {
  it("normalises omitted display fields into deliberate missing-data cases", () => {
    const d = dataSchema.parse({ products: [{ id: "only-id" }] });
    expect(d.products[0].title).toBe("");
    expect(d.products[0].price).toBeNull();
    expect(d.products[0].image).toBeNull();
    expect(d.people).toEqual([]);
  });
  it.each(presets.map((p) => p.id))("validates the %s fixture", (id) => {
    expect(dataSchema.safeParse(fixture(id)).success).toBe(true);
  });
  it("preserves zero prices, large values and missing fields", () => {
    const d = fixture("extreme");
    expect(d.products[1].price).toBe(0);
    expect(d.products[0].price).toBeGreaterThan(1e9);
    expect(fixture("missing").products[0].price).toBeNull();
  });
  it("rejects duplicate IDs and executable image URLs", () => {
    const d = fixture("baseline");
    d.products[1].id = d.products[0].id;
    expect(dataSchema.safeParse(d).success).toBe(false);
    d.products[1].id = "new";
    d.products[0].image = "javascript:alert(1)";
    expect(dataSchema.safeParse(d).success).toBe(false);
  });
  it("bounds viewport, delay and record limits", () => {
    expect(
      configSchema.safeParse({ ...defaultConfig(), width: 200 }).success,
    ).toBe(false);
    expect(
      configSchema.safeParse({ ...defaultConfig(), delay: 6000 }).success,
    ).toBe(false);
    const d = fixture("baseline");
    d.products = Array.from({ length: 31 }, (_, i) => ({
      ...d.products[0],
      id: String(i),
    }));
    expect(dataSchema.safeParse(d).success).toBe(false);
  });
  it("does not invent layout measurements before a frame reports", () => {
    expect(
      observations(defaultConfig(), null).some(
        (o) => o.name === "Viewport overflow",
      ),
    ).toBe(false);
  });
  it("distinguishes measured overflow and intentional scroll regions", () => {
    const o = observations(defaultConfig(), {
      overflow: true,
      scrollRegions: 1,
      smallTargets: 0,
      height: 600,
    });
    expect(o.find((x) => x.name === "Viewport overflow")?.level).toBe(
      "warning",
    );
    expect(o.find((x) => x.name === "Scrollable regions")?.level).toBe("info");
  });
  it("imports snapshots under a new ID and validates null/corrupt files", () => {
    const s = {
      version: 1,
      id: "saved",
      name: "Mobile card",
      updatedAt: 1,
      config: defaultConfig(),
    };
    const imported = parseImport(JSON.stringify(s));
    expect(imported.id).not.toBe("saved");
    expect(imported.config.width).toBe(768);
    expect(() => parseImport("null")).toThrow("not a valid StateLab");
    expect(() => parseImport("{")).toThrow("not valid JSON");
    expect(() => parseImport("x".repeat(500001))).toThrow("smaller");
  });
  it("saves and restores configurations without changing their data", () => {
    const values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k),
      setItem: (k: string, v: string) => values.set(k, v),
    });
    const scenario = scenarioSchema.parse({
      version: 1,
      id: "test",
      name: "My case",
      updatedAt: 1,
      config: defaultConfig(),
    });
    expect(saveScenarios([scenario])).toBe(true);
    expect(loadScenarios().scenarios[0].config).toEqual(scenario.config);
  });
  it("reports unavailable and corrupt storage without silently repairing it", () => {
    const set = vi.fn(() => {
      throw Error("quota");
    });
    vi.stubGlobal("localStorage", { getItem: () => "{", setItem: set });
    expect(loadScenarios().warning).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
    expect(saveScenarios([])).toBe(false);
  });
});
describe("API adapters", () => {
  it("maps live products from the fixed API and preserves zero stock", async () => {
    const f = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          products: [
            {
              id: 1,
              title: "Demo",
              description: "Description",
              price: 0,
              stock: 0,
              category: "sample",
              thumbnail: "https://cdn.dummyjson.com/x.webp",
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", f);
    const d = await fetchProducts(9999, new AbortController().signal);
    expect(d[0].price).toBe(0);
    expect(d[0].stock).toBe(0);
    expect(f.mock.calls[0][0]).toBe(
      "https://dummyjson.com/products?limit=8&delay=5000",
    );
  });
  it("rejects malformed live responses instead of applying them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"products":[]}')),
    );
    await expect(
      fetchProducts(0, new AbortController().signal),
    ).rejects.toThrow();
  });
  it("keeps cancellation distinct from generator fallback", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("aborted")));
    await expect(
      generateCase("product", "long", controller.signal),
    ).rejects.toThrow();
  });
  it("generates a labelled local fixture when the optional provider is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("offline")));
    const result = await generateCase(
      "people",
      "missing",
      new AbortController().signal,
    );
    expect(result.mode).toBe("local");
    expect(result.data.people[0].name).toBe("");
  });
});
