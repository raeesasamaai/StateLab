import { z } from "zod";
import assets from "virtual:assets";
import { dataSchema } from "../src/lib/model";
import { fixture } from "../src/lib/fixtures";
type Env = { APINEX_API_KEY?: string; APINEX_MODEL?: string };
const input = z
  .object({
    component: z.enum(["product", "table", "people"]),
    challenge: z.enum(["long", "missing", "unicode", "extreme", "unbroken"]),
  })
  .strict();
const quotas = new Map<string, { at: number; count: number }>();
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function generateRequest(
  request: Request,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "Origin not allowed" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return json({ error: "JSON required" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Body required" }, 400);
  let size = 0,
    body = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512) {
        await reader.cancel();
        return json({ error: "Request too large" }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  let args: z.infer<typeof input>;
  try {
    args = input.parse(JSON.parse(body));
  } catch {
    return json({ error: "Invalid component or challenge" }, 400);
  }
  const fallback = () => json({ mode: "local", data: fixture(args.challenge) });
  const model = env.APINEX_MODEL || "free/claude-opus-4.6";
  if (!env.APINEX_API_KEY || !model.startsWith("free/")) return fallback();
  const now = Date.now();
  for (const [k, v] of quotas) if (now - v.at > 60000) quotas.delete(k);
  if (quotas.size > 2000) return fallback();
  const key = `ip:${request.headers.get("cf-connecting-ip") || "anonymous"}`;
  const user = quotas.get(key) || { at: now, count: 0 },
    global = quotas.get("global") || { at: now, count: 0 };
  if (user.count >= 2 || global.count >= 4) return fallback();
  user.count++;
  global.count++;
  quotas.set(key, user);
  quotas.set("global", global);
  try {
    const response = await fetcher(
      "https://api.apinex.bond/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.APINEX_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(11000),
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          temperature: 0.65,
          messages: [
            {
              role: "system",
              content:
                'Create synthetic UI edge-case test data. Return ONLY JSON with exactly {"products":[{"id":"p1","title":"...","description":"...","price":123.45,"stock":20,"category":"...","image":null}],"people":[{"id":"u1","name":"...","email":"person@example.com","role":"...","company":"...","avatar":null}]}. Include 3 products and 4 people. All IDs unique within each list. All image/avatar fields must be null. Names and companies must be fictional; email domain example.com only. No real personal information. Match the requested challenge: long = long human-readable names/descriptions, missing = blank text/null prices/null stock, unicode = different scripts, extreme = large nonnegative finite prices up to 1e12 and integer stock up to 1e8, unbroken = long unspaced strings. Titles/names under 900 chars; descriptions under 1500 chars; category/role under 900 chars. No HTML or Markdown.',
            },
            { role: "user", content: JSON.stringify(args) },
          ],
        }),
      },
    );
    if (!response.ok) return fallback();
    const d = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = d.choices?.[0]?.message?.content;
    if (!content || content.length > 50000) return fallback();
    const data = dataSchema.parse(
      JSON.parse(
        content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
      ),
    );
    if (!data.products.length || !data.people.length) return fallback();
    data.products = data.products.map((p) => ({ ...p, image: null }));
    data.people = data.people.map((p, i) => ({
      ...p,
      avatar: null,
      email:
        p.email && p.email.endsWith("@example.com")
          ? p.email
          : `person${i + 1}@example.com`,
    }));
    return json({ mode: "ai", data });
  } catch {
    return fallback();
  }
}
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate") return generateRequest(request, env);
    if (url.pathname === "/api/health")
      return json({
        status: "ok",
        ai:
          !!env.APINEX_API_KEY &&
          (env.APINEX_MODEL || "free/claude-opus-4.6").startsWith("free/"),
        version: "1.0.0",
      });
    if (url.pathname.startsWith("/api/"))
      return json({ error: "Not found" }, 404);
    if (!["GET", "HEAD"].includes(request.method))
      return json({ error: "Method not allowed" }, 405);
    const asset =
      assets[url.pathname] ??
      (url.pathname.includes(".") ? null : assets["/index.html"]);
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(asset.body), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": asset.type,
          "Cache-Control": url.pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://dummyjson.com; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
        },
      },
    );
  },
};
