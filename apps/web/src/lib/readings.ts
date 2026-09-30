// Numeric checklist readings (e.g. barrel diameter in mm, zone temperature in °C).
// A checklist item with inputType "number" stores the measured value plus optional limits.
export interface Reading {
  inputType?: "check" | "number";
  unit?: string;
  min?: number;
  max?: number;
  value?: number;
}

export const isNumeric = (c: Reading) => c.inputType === "number";

export const inRange = (c: Reading, v: number) =>
  (c.min == null || v >= c.min) && (c.max == null || v <= c.max);

export const limitsText = (c: Reading) => {
  const u = c.unit ? ` ${c.unit}` : "";
  if (c.min != null && c.max != null) return `${c.min}–${c.max}${u}`;
  if (c.min != null) return `≥ ${c.min}${u}`;
  if (c.max != null) return `≤ ${c.max}${u}`;
  return "";
};

export const readingText = (c: Reading) => {
  if (c.value == null) return "";
  const limits = limitsText(c);
  return `${c.value}${c.unit ? ` ${c.unit}` : ""}${limits ? ` (spec ${limits})` : ""}`;
};

// Normalize the reading fields of a raw checklist JSON item so every page reads them the same way.
const num = (v: unknown) => (v === "" || v == null || isNaN(Number(v)) ? undefined : Number(v));
export const pickReading = (c: Record<string, unknown>): Reading =>
  c?.inputType === "number"
    ? { inputType: "number", unit: (c.unit as string) || undefined, min: num(c.min), max: num(c.max), value: num(c.value) }
    : {};

// Self-check: npx tsx src/lib/readings.ts
if (typeof window === "undefined" && process.argv[1]?.endsWith("readings.ts")) {
  const spec = { inputType: "number" as const, unit: "mm", min: 46.5, max: 47.2 };
  if (!(inRange(spec, 47.09) && !inRange(spec, 47.3) && !inRange(spec, 46.4))) throw new Error("inRange");
  if (!(inRange({ max: 200 }, -5) && !inRange({ min: 0 }, -1))) throw new Error("one-sided limits");
  if (!(readingText({ ...spec, value: 47.09 }) === "47.09 mm (spec 46.5–47.2 mm)")) throw new Error("readingText");
  if (!(pickReading({ inputType: "number", min: "", max: "47.2", value: "46.81" }).min === undefined)) throw new Error("empty min");
  if (!(pickReading({ inputType: "number", value: "46.81" }).value === 46.81)) throw new Error("string value");
  if (!(Object.keys(pickReading({ text: "tick" })).length === 0)) throw new Error("check item untouched");
  console.log("readings ok");
}
