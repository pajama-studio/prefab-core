import type { Components } from "../types.js";
import { isPickable } from "../pickable.js";

/** How an entity is simulated in play. */
export type PhysicsMode = "dynamic" | "fixed" | "none";

type PhysicsEntity = { components: Components; assetRef?: { modelUrl: string | null } };

/**
 * A pure EMITTER NODE: vfx / light / fluid source with no mesh of its own and
 * no physical gameplay role. These render as small markers in edit (not a
 * placeholder cube) and must never collide in play — a dropped 💧/🔥/💡 gadget
 * is an effect anchor, not scenery.
 */
export function isEmitterOnly(entity: PhysicsEntity): boolean {
  const c = entity.components;
  const hasEmitter = !!(c.vfx || c.light || c.fluidSource);
  const hasMesh = !!(entity.assetRef?.modelUrl || c.primitive);
  const hasRole = !!(c.station || c.holder || c.appliance || c.ingredient || c.cookable || c.openable || c.tool || c.softBody || c.character);
  return hasEmitter && !hasMesh && !hasRole;
}

/**
 * Resolve an entity's physics body mode. `auto` (the default) keeps the original
 * behaviour — dynamic if the player can pick it up, otherwise fixed scenery;
 * pure emitter nodes get no body at all. An explicit `physics` value wins.
 * Single source of truth for the play physics wiring and the editor.
 */
export function resolvePhysics(entity: PhysicsEntity, hasChildren = false): PhysicsMode {
  const p = entity.components.physics;
  if (p === "dynamic" || p === "fixed" || p === "none") return p; // explicit wins
  // auto: a structural parent (has attached children) stays fixed so it doesn't
  // tumble under gravity and drag its children away from their edited layout;
  // emitter nodes never collide; otherwise dynamic if pickable, else fixed.
  if (hasChildren) return "fixed";
  if (isEmitterOnly(entity)) return "none";
  return isPickable(entity) ? "dynamic" : "fixed";
}
