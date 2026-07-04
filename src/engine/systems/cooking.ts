import type { EngineState, GameEvent, Input } from "../types";

export interface System {
  id: string;
  step(state: EngineState, dtMs: number, inputs: Input[]): EngineState;
}

export const cookingSystem: System = {
  id: "cooking",
  step(state, dtMs) {
    const entities = { ...state.entities };
    const events: GameEvent[] = [...state.events];
    let changed = false;
    for (const [id, e] of Object.entries(state.entities)) {
      const c = e.components.cookable;
      if (!c || !c.active) continue;
      const elapsedSec = c.elapsedSec + dtMs / 1000;
      const stateKey = elapsedSec >= c.burnSec ? "burnt" : elapsedSec >= c.cookSec ? "cooked" : "raw";
      // Emit an event when the cooking state changes, so triggers can react.
      if (stateKey !== c.state) events.push({ type: "cookableState", entityId: id, state: stateKey });
      entities[id] = { ...e, components: { ...e.components, cookable: { ...c, elapsedSec, state: stateKey } } };
      changed = true;
    }
    return changed ? { ...state, entities, events } : state;
  },
};
