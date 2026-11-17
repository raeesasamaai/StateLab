import { z } from "zod";
import { dataSchema, type Dataset, type Config } from "./model";
import { fixture } from "./fixtures";
const productsSchema = z.object({
  products: z
    .array(
      z.object({
        id: z.number(),
        title: z.string().max(5000),
        description: z.string().max(8000),
        price: z.number().min(0),
        stock: z.number().int().min(0),
        category: z.string().max(1000),
        thumbnail: z.string().url(),
      }),
    )
    .min(1)
    .max(30),
});
export async function fetchProducts(
  delay: number,
  signal: AbortSignal,
): Promise<Dataset["products"]> {
  const r = await fetch(
    `https://dummyjson.com/products?limit=8&delay=${Math.max(0, Math.min(5000, Math.round(delay)))}`,
    { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) },
  );
  if (!r.ok)
    throw new Error(`API returned ${r.status}. Your existing data was kept.`);
  const d = productsSchema.parse(await r.json());
  return d.products.map((p) => ({
    id: `api-${p.id}`,
    title: p.title,
    description: p.description,
    price: p.price,
    stock: p.stock,
    category: p.category,
    image: p.thumbnail,
  }));
}
export async function generateCase(
  component: Config["component"],
  challenge: Config["preset"],
  signal: AbortSignal,
) {
  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ component, challenge }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(14000)]),
    });
    if (!r.ok) throw Error("Generator unavailable");
    const d = await r.json();
    return {
      data: dataSchema.parse(d.data),
      mode: d.mode === "ai" ? ("ai" as const) : ("local" as const),
    };
  } catch (e) {
    if (signal.aborted) throw e;
    return { data: fixture(challenge), mode: "local" as const };
  }
}
