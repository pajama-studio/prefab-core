import type { Components } from "./types.js";

/** Whether the player can pick this entity up (explicit `pickable` flag). */
export const isPickable = (e: { components: Components }): boolean => {
  const c = e.components;
  if (typeof c.pickable === "boolean") return c.pickable;
  if (c.primitive) return false;
  if (c.station) return false;
  return !!(c.ingredient || c.cookable || c.holder || c.tool);
};
