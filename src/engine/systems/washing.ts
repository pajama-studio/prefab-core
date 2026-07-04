import type { EngineState, Input } from "../types";
import type { System } from "./cooking";

/**
 * The wash loop: a DIRTY washable item sitting inside a holder that currently
 * holds water (fillable.level > 0 — a filled sink basin, a pot of water)
 * accumulates wash time; at washSec it flips clean and emits `washed`.
 * Taking it out of the water pauses progress (no decay — soaking counts).
 */
export const washingSystem: System = {
  id: "washing",
  step(state: EngineState, dtMs: number, _inputs: Input[]): EngineState {
    let changed = false;
    const entities = { ...state.entities };
    const events = [...state.events];
    for (const holder of Object.values(state.entities)) {
      const h = holder.components.holder;
      const f = holder.components.fillable;
      if (!h || !f || f.level <= 0 || h.held.length === 0) continue;
      for (const id of h.held) {
        const item = entities[id];
        const w = item?.components.washable;
        if (!w?.dirty) continue;
        const elapsedSec = (w.elapsedSec ?? 0) + dtMs / 1000;
        const done = elapsedSec >= w.washSec;
        entities[id] = {
          ...item,
          components: {
            ...item.components,
            washable: { ...w, elapsedSec, dirty: !done },
          },
        };
        if (done) events.push({ type: "washed", entityId: id });
        changed = true;
      }
    }
    return changed ? { ...state, entities, events } : state;
  },
};
