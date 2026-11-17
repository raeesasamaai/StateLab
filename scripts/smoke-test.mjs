import assert from "node:assert/strict";
import worker from "../dist/server/index.js";
const request = (path, init) =>
  worker.fetch(new Request("https://statelab.test" + path, init), {});
for (const path of ["/", "/preview.html"]) {
  const response = await request(path);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-security-policy"));
  const html = await response.text();
  assert.match(html, /StateLab/);
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) {
    const asset = await request(m[1]);
    assert.equal(asset.status, 200);
    assert.ok((await asset.arrayBuffer()).byteLength > 0);
  }
}
assert.equal((await request("/sample-chair.svg")).status, 200);
assert.equal((await request("/api/health")).status, 200);
assert.equal((await request("/missing.js")).status, 404);
const generated = await request("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ component: "product", challenge: "long" }),
});
const body = await generated.json();
assert.equal(body.mode, "local");
assert.ok(body.data.products[0].title.length > 80);
console.log(
  "Production smoke checks passed: main app, preview app, assets, illustration, headers, health, generator and 404s.",
);
