import { scenarioSchema, workspaceSchema, type Scenario } from "./model";
export const KEY = "statelab:scenarios:v1";
export function loadScenarios(): { scenarios: Scenario[]; warning: string } {
  try {
    const raw = localStorage.getItem(KEY);
    return {
      scenarios: raw ? workspaceSchema.parse(JSON.parse(raw)).scenarios : [],
      warning: "",
    };
  } catch {
    return {
      scenarios: [],
      warning:
        "Saved scenarios could not be read. Browser data is left untouched until you save a new scenario.",
    };
  }
}
export function saveScenarios(scenarios: Scenario[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, scenarios }));
    return true;
  } catch {
    return false;
  }
}
export function parseImport(raw: string): Scenario {
  if (raw.length > 500000)
    throw new Error("Use a StateLab scenario smaller than 500 KB.");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const result = scenarioSchema.safeParse(data?.scenario ?? data);
  if (!result.success)
    throw new Error("This is not a valid StateLab scenario export.");
  return { ...result.data, id: crypto.randomUUID(), updatedAt: Date.now() };
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
