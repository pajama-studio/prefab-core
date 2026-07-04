import type { GameDef } from "./types.js";

export function validateGameDef(
  value: unknown,
): { ok: true; def: GameDef } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const v = value as Partial<GameDef> | null;

  if (!v || typeof v !== "object") return { ok: false, errors: ["definition must be an object"] };
  if (typeof v.id !== "string") errors.push("id must be a string");
  if (typeof v.name !== "string") errors.push("name must be a string");
  if (!v.grid || v.grid.cols <= 0 || v.grid.rows <= 0) errors.push("grid cols/rows must be > 0");
  if (!v.sim || typeof v.sim.tickMs !== "number" || v.sim.tickMs <= 0) errors.push("sim.tickMs must be > 0");
  if (!Array.isArray(v.entities)) {
    errors.push("entities must be an array");
  } else {
    const seen = new Set<string>();
    for (const e of v.entities) {
      if (!e || typeof e.id !== "string") { errors.push("entity id must be a string"); continue; }
      if (seen.has(e.id)) errors.push(`duplicate entity id: ${e.id}`);
      seen.add(e.id);
      if (!e.assetRef || typeof e.assetRef.id !== "string") errors.push(`entity ${e.id} missing assetRef`);
      if (e.hidden !== undefined && typeof e.hidden !== "boolean") errors.push(`entity ${e.id} hidden must be boolean`);
      if (e.locked !== undefined && typeof e.locked !== "boolean") errors.push(`entity ${e.id} locked must be boolean`);
      const t = e.components?.transform;
      if (t) {
        const p = t.position;
        if (!p || ![p.x, p.y, p.z].every((n) => typeof n === "number" && Number.isFinite(n)))
          errors.push(`entity ${e.id} transform.position must be finite numbers`);
        if (typeof t.scale !== "number" || !(t.scale > 0)) errors.push(`entity ${e.id} transform.scale must be > 0`);
        if (typeof t.rotationY !== "number" || !Number.isFinite(t.rotationY)) errors.push(`entity ${e.id} transform.rotationY must be a finite number`);
      }
    }
  }
  // customModels is optional; each entry must at minimum have id + modelUrl strings.
  if (v.customModels !== undefined) {
    if (!Array.isArray(v.customModels)) {
      errors.push("customModels must be an array");
    } else {
      for (const m of v.customModels) {
        if (!m || typeof m.id !== "string" || typeof m.modelUrl !== "string")
          errors.push("each customModel must have id and modelUrl strings");
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, def: v as GameDef };
}
