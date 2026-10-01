// Checklist sections — the headed blocks of a paper PM card (e.g. "BARREL & SCREW MEASUREMENTS",
// "TEMPERATURE CALIBRATION"). Each checklist item carries an optional `section` name; items
// without one fall under GENERAL. Sections show in the order they first appear in the list.

export const DEFAULT_SECTION = "GENERAL";

export const sectionOf = (c: { section?: string | null }) => c.section?.trim() || DEFAULT_SECTION;

export function groupBySection<T extends { section?: string | null }>(items: T[]): { section: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = sectionOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups, ([section, items]) => ({ section, items }));
}

// Reorder so each section's items sit together (stored order = displayed order).
export const sortBySection = <T extends { section?: string | null }>(items: T[]): T[] =>
  groupBySection(items).flatMap((g) => g.items);

// Self-check: node --experimental-strip-types src/lib/sections.ts
if (typeof window === "undefined" && process.argv[1]?.endsWith("sections.ts")) {
  const items = [
    { id: "a", section: "BARREL" },
    { id: "b", section: "TEMP" },
    { id: "c" },
    { id: "d", section: " BARREL " },
    { id: "e", section: "" },
  ];
  const groups = groupBySection(items);
  if (groups.map((g) => g.section).join() !== "BARREL,TEMP,GENERAL") throw new Error("group order");
  if (groups[0].items.map((i) => i.id).join() !== "a,d") throw new Error("trimmed names merge");
  if (groups[2].items.map((i) => i.id).join() !== "c,e") throw new Error("blank -> GENERAL");
  if (sortBySection(items).map((i) => i.id).join() !== "a,d,b,c,e") throw new Error("sortBySection");
  console.log("sections ok");
}
