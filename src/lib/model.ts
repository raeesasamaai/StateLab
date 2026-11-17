import { z } from "zod";
const image = z
  .string()
  .max(2000)
  .refine(
    (s) => s.startsWith("https://") || /^\/(?!\/)/.test(s),
    "Use an HTTPS or local image URL",
  )
  .nullable()
  .default(null);
export const productSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(5000).default(""),
  description: z.string().max(8000).default(""),
  price: z.number().min(0).max(1e15).nullable().default(null),
  stock: z.number().int().min(0).max(1e9).nullable().default(null),
  category: z.string().max(1000).default(""),
  image,
});
export const personSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(5000).default(""),
  email: z.string().max(5000).default(""),
  role: z.string().max(1000).default(""),
  company: z.string().max(2000).default(""),
  avatar: image,
});
export const dataSchema = z
  .object({
    products: z.array(productSchema).max(30).default([]),
    people: z.array(personSchema).max(50).default([]),
  })
  .superRefine((d, c) => {
    if (
      new Set(d.products.map((p) => p.id)).size !== d.products.length ||
      new Set(d.people.map((p) => p.id)).size !== d.people.length
    )
      c.addIssue({
        code: "custom",
        message: "Record IDs must be unique within each list.",
      });
  });
export type Dataset = z.infer<typeof dataSchema>;
export const configSchema = z.object({
  component: z.enum(["product", "table", "people"]),
  preset: z.enum([
    "baseline",
    "long",
    "missing",
    "empty",
    "unicode",
    "extreme",
    "unbroken",
    "custom",
  ]),
  state: z.enum(["ready", "loading", "empty", "error"]),
  errorSource: z.enum(["simulation", "live"]).default("simulation"),
  width: z.number().int().min(280).max(1440),
  theme: z.enum(["light", "dark"]),
  textScale: z.number().int().min(100).max(200),
  direction: z.enum(["ltr", "rtl"]),
  currency: z.enum(["USD", "ZAR", "EUR"]),
  delay: z.number().int().min(0).max(5000),
  outcome: z.enum(["success", "error"]),
  data: dataSchema,
});
export type Config = z.infer<typeof configSchema>;
export const scenarioSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  updatedAt: z.number(),
  config: configSchema,
});
export type Scenario = z.infer<typeof scenarioSchema>;
export const workspaceSchema = z.object({
  version: z.literal(1),
  scenarios: z.array(scenarioSchema).max(50),
});
export const uid = () => crypto.randomUUID();
export const reportSchema = z.object({
  overflow: z.boolean(),
  scrollRegions: z.number().int().min(0).max(1000),
  smallTargets: z.number().int().min(0).max(1000),
  height: z.number().min(0).max(50000),
});
export type FrameReport = z.infer<typeof reportSchema>;
