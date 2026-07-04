import type { RuntimeEntity } from "../types.js";
import type { System } from "./cooking.js";

/**
 * Fluid system — a running `fluidSource` (faucet) fills the `fillable`
 * container directly below it.
 *
 * Pure position math (the engine has no mesh knowledge): a fillable "catches"
 * the stream when it sits below the source and its XZ distance to the stream
 * column is within its catch radius (scaled). If several qualify, the HIGHEST
 * one catches — the stream visually stops at the first surface. Level rises by
 * `rate` units/second up to `capacity`; crossing capacity emits a one-shot
 * `filled` event (the trigger system can react to it).
 */

/** How far (in world units, ×fillable scale) a container's mouth reaches. */
export const CATCH_RADIUS = 0.55;

/** The fillable that catches a stream from `source`, or undefined. Exported for
 *  the runtime, so the visual stream and the gameplay agree on the target. */
export function catchTarget(
  source: RuntimeEntity,
  entities: Iterable<RuntimeEntity>,
): RuntimeEntity | undefined {
  const st = source.components.transform;
  if (!st) return undefined;
  let best: RuntimeEntity | undefined;
  let bestY = -Infinity;
  for (const e of entities) {
    if (e.id === source.id || !e.components.fillable) continue;
    const t = e.components.transform;
    if (!t || t.position.y >= st.position.y) continue; // must be below the tap
    const dx = t.position.x - st.position.x;
    const dz = t.position.z - st.position.z;
    const r = CATCH_RADIUS * Math.max(t.scale, 0.5);
    if (dx * dx + dz * dz > r * r) continue;
    if (t.position.y > bestY) { bestY = t.position.y; best = e; }
  }
  return best;
}

/** Litres/second a tipped container pours. */
export const POUR_RATE = 1.2;

export const fluidSystem: System = {
  id: "fluid",
  step(state, dtMs) {
    let entities = state.entities;
    let events = state.events;
    let changed = false;

    for (const source of Object.values(state.entities)) {
      const fs = source.components.fluidSource;
      if (!fs?.on) continue;
      const target = catchTarget(source, Object.values(entities));
      const fill = target?.components.fillable;
      if (!target || !fill || fill.level >= fill.capacity) continue;
      const next = Math.min(fill.capacity, fill.level + (fs.rate ?? 1) * (dtMs / 1000));
      entities = {
        ...entities,
        [target.id]: { ...target, components: { ...target.components, fillable: { ...fill, level: next } } },
      };
      if (next >= fill.capacity) events = [...events, { type: "filled", entityId: target.id }];
      changed = true;
    }

    // ── pouring containers: conservation transfer into the catch below ──
    for (const source of Object.values(entities)) {
      const f = source.components.fillable;
      if (!f?.pouring) continue;
      if (f.level <= 0) {
        // ran dry — tipping back upright is automatic
        entities = {
          ...entities,
          [source.id]: { ...source, components: { ...source.components, fillable: { ...f, pouring: false } } },
        };
        changed = true;
        continue;
      }
      const drained = Math.min(f.level, POUR_RATE * (dtMs / 1000));
      entities = {
        ...entities,
        [source.id]: { ...source, components: { ...source.components, fillable: { ...f, level: f.level - drained } } },
      };
      const target = catchTarget(source, Object.values(entities));
      const tf = target?.components.fillable;
      if (target && tf && tf.level < tf.capacity) {
        const next = Math.min(tf.capacity, tf.level + drained);
        entities = {
          ...entities,
          [target.id]: { ...target, components: { ...target.components, fillable: { ...tf, level: next } } },
        };
        if (next >= tf.capacity) events = [...events, { type: "filled", entityId: target.id }];
      }
      // no catcher below → the water spills (visually the MPM shows it)
      changed = true;
    }

    return changed ? { ...state, entities, events } : state;
  },
};
