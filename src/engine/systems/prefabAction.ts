import type { System } from "../system.js";
import { applyTriggerAction } from "./actions.js";

/**
 * Executes `callPrefabAction` inputs — the game-logic entry point for the
 * named actions a prefab exposes (see PrefabAction in types). Runs before the
 * trigger system so any events the steps emit are visible to triggers in the
 * same tick.
 */
export const prefabActionSystem: System = {
  id: "prefabAction",
  step(state, _dtMs, inputs) {
    let st = { entities: state.entities, events: state.events, score: state.score, changed: false };
    for (const input of inputs) {
      if (input.type !== "callPrefabAction") continue;
      st = applyTriggerAction(st, state.def, { kind: "prefabAction", entityId: input.entityId, actionId: input.actionId });
    }
    return st.changed ? { ...state, entities: st.entities, events: st.events, score: st.score } : state;
  },
};
