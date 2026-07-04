import type { System } from "../system.js";
import type { GameEvent } from "../types.js";

export const timerSystem: System = {
  id: "timer",
  step(state, dtMs) {
    const entities = { ...state.entities };
    const events: GameEvent[] = [...state.events];
    let changed = false;
    for (const [id, e] of Object.entries(state.entities)) {
      const t = e.components.timer;
      if (!t) continue;
      const elapsedSec = t.elapsedSec + dtMs / 1000;
      if (t.elapsedSec < t.durationSec && elapsedSec >= t.durationSec)
        events.push({ type: "timerComplete", entityId: id, onComplete: t.onComplete });
      entities[id] = { ...e, components: { ...e.components, timer: { ...t, elapsedSec } } };
      changed = true;
    }
    return changed ? { ...state, entities, events } : state;
  },
};
