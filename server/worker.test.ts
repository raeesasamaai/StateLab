import { it, expect, vi, describe } from "vitest";
import { generateRequest } from "./worker";
import { fixture } from "../src/lib/fixtures";
const req = (body: unknown = { component: "product", challenge: "long" }) =>
  new Request("https://statelab.test/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://statelab.test",
      "CF-Connecting-IP": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
describe("optional generator", () => {
  it("works without an AI key and labels its local output", async () => {
    const r = await generateRequest(req(), {});
    const body = (await r.json()) as any;
    expect(body.mode).toBe("local");
    expect(body.data.products[0].title.length).toBeGreaterThan(80);
  });
  it("rejects extra fields so current user data cannot be sent accidentally", async () => {
    expect(
      (
        await generateRequest(
          req({ component: "product", challenge: "long", data: "private" }),
          {},
        )
      ).status,
    ).toBe(400);
  });
  it("rejects oversized and cross-origin input", async () => {
    expect((await generateRequest(req("x".repeat(1000)), {})).status).toBe(413);
    const r = req();
    r.headers.set("Origin", "https://other.test");
    expect((await generateRequest(r, {})).status).toBe(403);
  });
  it("rejects incompatible methods", async () => {
    expect(
      (
        await generateRequest(
          new Request("https://statelab.test/api/generate"),
          {},
        )
      ).status,
    ).toBe(405);
  });
  it("never calls a paid model even when misconfigured", async () => {
    const f = vi.fn();
    const r = await generateRequest(
      req(),
      { APINEX_API_KEY: "test", APINEX_MODEL: "paid/model" },
      f,
    );
    expect(f).not.toHaveBeenCalled();
    expect(((await r.json()) as any).mode).toBe("local");
  });
  it("validates AI results, removes image requests and constrains emails", async () => {
    const d = fixture("long");
    d.people[0].email = "real@other.test";
    const f = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(d) } }],
          }),
        ),
      );
    const r = await generateRequest(req(), { APINEX_API_KEY: "test" }, f);
    const body = (await r.json()) as any;
    expect(body.mode).toBe("ai");
    expect(body.data.products.every((p: any) => p.image === null)).toBe(true);
    expect(body.data.people[0].email).toBe("person1@example.com");
  });
  it("falls back on malformed provider responses", async () => {
    const f = vi.fn().mockResolvedValue(new Response('{"choices":[]}'));
    const r = await generateRequest(req(), { APINEX_API_KEY: "test" }, f);
    expect(((await r.json()) as any).mode).toBe("local");
  });
});
