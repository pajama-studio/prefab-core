import type { System } from "../system.js";
import type { EngineState, GameEvent, TriggerWhen } from "../types.js";
import { applyTriggerAction } from "./actions.js";

function matches(when: TriggerWhen, events: GameEvent[], score: number): boolean {
  switch (when.kind) {
    case "start":
      return events.some((e) => e.type === "start");
    case "cookableState":
      return events.some((e) => e.type === "cookableState" && e.entityId === when.entityId && e.state === when.state);
    case "timerComplete":
      return events.some((e) => e.type === "timerComplete" && e.entityId === when.entityId);
    case "filled":
      return events.some((e) => e.type === "filled" && e.entityId === when.entityId);
    case "scoreAtLeast":
      // Edge-triggered: fires on the tick the running total crosses the value.
      return events.some((e) => e.type === "scoreChanged" && e.total >= when.value) && score >= when.value;
  }
}

/**
 * Declarative logic. Each authored trigger whose `when` matches the events
 * emitted this tick applies its `do` action — toggling cooking, changing a
 * visual state, adding score, or ending the game (win/lose).
 *
 * Runs to a fixpoint (max 6 passes) so a chain like start → addScore →
 * scoreAtLeast → win resolves within one tick regardless of authoring order;
 * each trigger fires at most once per tick to prevent loops.
 */
export const triggerSystem: System = {
  id: "trigger",
  step(state) {
    const triggers = state.def.triggers ?? [];
    if (!triggers.length) return state;

    let st = { entities: state.entities, events: state.events, score: state.score, changed: false };
    const fired = new Set<string>();

    for (let pass = 0; pass < 6; pass++) {
      let firedThisPass = false;
      for (const tr of triggers) {
        if (fired.has(tr.id)) continue;
        if (!matches(tr.when, st.events, st.score)) continue;
        fired.add(tr.id);
        firedThisPass = true;
        st = { ...applyTriggerAction(st, state.def, tr.do), changed: true };
      }
      if (!firedThisPass) break;
    }

    return st.changed
      ? ({ ...state, entities: st.entities, events: st.events, score: st.score } as EngineState)
      : state;
  },
};
