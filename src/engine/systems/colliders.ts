import type { Components } from "../types.js";
import { isPickable } from "../pickable.js";

/** The concrete collider shapes Rapier builds (no "auto" — that's resolved). */
export type ColliderKind = "cuboid" | "hull" | "trimesh" | "compound";

/**
 * Resolve the effective collider kind for an entity.
 *
 * `auto` (the default when no collider is set) picks **trimesh** for fixed
 * furniture/containers — so dropped items fall *into* open pots, sinks and
 * fridges and rest on the real interior surface — and **hull** for pickable
 * dynamic items, because Rapier's trimesh colliders are only stable on fixed
 * bodies.
 *
 * An explicit non-auto kind wins, with one safety override: a `trimesh` asked
 * for on a pickable (dynamic) body is downgraded to `hull`, since a dynamic
 * trimesh collides unreliably (and never with another trimesh).
 *
 * Single source of truth for the physics wiring and the editor preview.
 */
export function resolveColliderKind(entity: { components: Components }): ColliderKind {
  const set = entity.components.collider?.kind;
  const pickable = isPickable(entity);
  let kind: ColliderKind = !set || set === "auto" ? (pickable ? "hull" : "trimesh") : set;
  if (kind === "trimesh" && pickable) kind = "hull";
  return kind;
}
