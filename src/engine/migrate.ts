import type { GameDef } from "./types";

/** Upgrade any entity using the legacy grid `{x,y}` transform to the 3D transform.
 *  Pure: returns a new def object; non-matching entities pass through unchanged. */
export function migrateDef(raw: unknown): unknown {
  const def = raw as Partial<GameDef> & { entities?: any[]; grid?: { cellSize?: number } };
  if (!def || !Array.isArray(def.entities)) return raw;
  const cell = def.grid?.cellSize ?? 1;
  const entities = def.entities.map((e) => {
    const t = e?.components?.transform as any;
    const isLegacy = t && typeof t.x === "number" && typeof t.y === "number" && t.position === undefined;
    if (!isLegacy) return e;
    return {
      ...e,
      components: {
        ...e.components,
        transform: { position: { x: t.x * cell, y: 0, z: t.y * cell }, rotationY: 0, scale: 1 },
      },
    };
  });
  // Migrate legacy recipes whose `inputs` were plain strings → IngredientReq[].
  const recipes = ((def as { recipes?: { inputs?: unknown[] }[] }).recipes ?? []).map((r) => ({
    ...r,
    inputs: (r.inputs ?? []).map((i) => (typeof i === "string" ? { type: i } : i)),
  }));
  // Default newer fields so older persisted defs load cleanly.
  return { ...def, entities, recipes, triggers: def.triggers ?? [] };
}
