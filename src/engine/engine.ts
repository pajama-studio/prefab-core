import type { EngineState, GameDef, GameEvent, Input, Prefab, RuntimeEntity } from "./types";
import { expandEntities } from "./prefab";
import { inputSystem } from "./systems/input";
import { interactSystem } from "./systems/interact";
import { cookingSystem, type System } from "./systems/cooking";
import { cookingPotSystem } from "./systems/cookingPot";
import { washingSystem } from "./systems/washing";
import { timerSystem } from "./systems/timer";
import { stateSystem } from "./systems/state";
import { fluidSystem } from "./systems/fluid";
import { prefabActionSystem } from "./systems/prefabAction";
import { triggerSystem } from "./systems/trigger";

// triggerSystem runs last so it sees the events emitted by the other systems.
export const SYSTEMS: System[] = [inputSystem, interactSystem, cookingSystem, cookingPotSystem, washingSystem, timerSystem, stateSystem, fluidSystem, prefabActionSystem, triggerSystem];

export function createEngine(def: GameDef): EngineState {
  const entities: Record<string, RuntimeEntity> = {};
  // Expand linked prefab instances into their sub-trees before building runtime
  // entities, so both edit and play see the resolved Actor hierarchy.
  const prefabsById: Record<string, Prefab> = Object.fromEntries((def.prefabs ?? []).map((p) => [p.id, p]));
  for (const e of expandEntities(def.entities, prefabsById)) {
    entities[e.id] = {
      id: e.id,
      name: e.name,
      assetRef: e.assetRef,
      components: structuredClone(e.components),
    };
  }
  // Pre-stock holders: copy initialHeld into held at game start.
  for (const e of Object.values(entities)) {
    const h = e.components.holder;
    if (h?.initialHeld?.length) {
      e.components.holder = { ...h, held: [...new Set([...h.held, ...h.initialHeld])] };
    }
  }
  return { def, timeMs: 0, entities, events: [], score: 0, hand: null, pockets: [null, null, null], discovered: [] };
}

export function step(state: EngineState, dtMs: number, inputs: Input[]): EngineState {
  const tick = state.def.sim.tickMs;
  let current: EngineState = state;
  let remaining = dtMs;
  let firstTick = true;
  // Events are per-tick: reset each slice so a one-shot event (e.g. a cooking
  // transition) only triggers once. Aggregate them for the step's return so the
  // UI sees every win/lose/score that occurred across the whole frame.
  const all: GameEvent[] = [];
  while (remaining > 0) {
    const slice = Math.min(tick, remaining);
    const tickInputs = firstTick ? inputs : [];
    // Seed a one-shot `start` event on the very first tick of a fresh run.
    const seed: GameEvent[] = firstTick && state.timeMs === 0 ? [{ type: "start" }] : [];
    current = { ...current, events: seed };
    current = SYSTEMS.reduce((s, sys) => sys.step(s, slice, tickInputs), current);
    all.push(...current.events);
    current = { ...current, timeMs: current.timeMs + slice };
    remaining -= slice;
    firstTick = false;
  }
  return { ...current, events: all };
}
