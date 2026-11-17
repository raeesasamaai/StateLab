import { type Config, type FrameReport } from "./model";
export type Observation = {
  name: string;
  detail: string;
  level: "info" | "warning" | "pass";
};
export function observations(
  c: Config,
  report: FrameReport | null,
): Observation[] {
  const records = c.component === "people" ? c.data.people : c.data.products;
  const long =
    c.component === "people"
      ? c.data.people.some((p) => p.name.length > 80 || p.email.length > 100)
      : c.data.products.some((p) => p.title.length > 80);
  const missing =
    c.component === "people"
      ? c.data.people.filter((p) => !p.name || !p.email).length
      : c.data.products.filter((p) => !p.title || p.price === null).length;
  const out: Observation[] = [
    {
      name: "Content length",
      detail: long
        ? "Long content is active. Check wrapping and hierarchy."
        : "Typical content lengths in this dataset.",
      level: long ? "warning" : "info",
    },
    {
      name: "Missing fields",
      detail: missing
        ? `${missing} record(s) require fallback content.`
        : "Core display fields are populated.",
      level: missing ? "warning" : "pass",
    },
    {
      name: "Result count",
      detail: `${records.length} record(s). ${records.length ? "Inspect first, last and selected rows." : "Check the empty-state recovery action."}`,
      level: "info",
    },
  ];
  if (report)
    out.push(
      {
        name: "Viewport overflow",
        detail: report.overflow
          ? "Content extends beyond the preview viewport. Inspect the layout."
          : "No horizontal document overflow detected in this render.",
        level: report.overflow ? "warning" : "pass",
      },
      {
        name: "Scrollable regions",
        detail: `${report.scrollRegions} horizontal region(s). Tables may intentionally scroll.`,
        level: "info",
      },
      {
        name: "Small targets",
        detail: `${report.smallTargets} control(s) measure under 24 × 24 CSS pixels. This is a limited geometry check.`,
        level: report.smallTargets ? "warning" : "pass",
      },
    );
  return out;
}
