import type { GameDef, GameEvent, RuntimeEntity, TriggerAction } from "../types.js";
import { resolveDish } from "./cookingPot.js";
import { instanceEntityId } from "../prefab.js";

/**
 * The single executor for TriggerActions — shared by the trigger system
 * (declarative logic), the prefab-action system (callPrefabAction input) and
 * anything else that wants to run game-logic steps. Pure: takes and returns
 * the (entities, events, score) triple.
 *
 * `prefabAction` resolves the instance's prefab, remaps each step's
 * prefab-local entityId to the instance scope, and applies the steps. Steps
 * may themselves be prefabAction (a workstation delegating to a nested
 * part's interface) up to depth 3 — each hop consumes depth, so no loops.
 */
export interface ActionState {
  entities: Record<string, RuntimeEntity>;
  events: GameEvent[];
  score: number;
  changed: boolean;
}

export function applyTriggerAction(st: ActionState, def: GameDef, a: TriggerAction, depth = 0): ActionState {
  const mutate = (id: string, fn: (e: RuntimeEntity) => RuntimeEntity) => {
    const e = st.entities[id];
    if (!e) return;
    st = { ...st, entities: { ...st.entities, [id]: fn(e) }, changed: true };
  };

  switch (a.kind) {
    case "setCookableActive":
      mutate(a.entityId, (e) =>
        e.components.cookable
          ? { ...e, components: { ...e.components, cookable: { ...e.components.cookable, active: a.active } } }
          : e,
      );
      return st;
    case "setStateful":
      mutate(a.entityId, (e) =>
        e.components.stateful
          ? { ...e, components: { ...e.components, stateful: { ...e.components.stateful, current: a.key } } }
          : e,
      );
      return st;
    case "setApplianceOn":
      mutate(a.entityId, (e) =>
        e.components.appliance
          ? { ...e, components: { ...e.components, appliance: { ...e.components.appliance, on: a.on } } }
          : e,
      );
      return st;
    case "setPouring": {
      mutate(a.entityId, (e) =>
        e.components.fillable
          ? { ...e, components: { ...e.components, fillable: { ...e.components.fillable, pouring: a.pouring } } }
          : e,
      );
      return st;
    }
    case "setFluidOn": {
      const had = st.entities[a.entityId]?.components.fluidSource;
      mutate(a.entityId, (e) =>
        e.components.fluidSource
          ? { ...e, components: { ...e.components, fluidSource: { ...e.components.fluidSource, on: a.on } } }
          : e,
      );
      // The tap squeak/splash cue rides the event stream.
      if (had && had.on !== a.on) st.events = [...st.events, { type: "fluidToggled", entityId: a.entityId, on: a.on }];
      return st;
    }
    case "addScore": {
      const score = st.score + a.amount;
      return { ...st, score, events: [...st.events, { type: "scoreChanged", total: score }], changed: true };
    }
    case "win":
      return st.events.some((e) => e.type === "win") ? st : { ...st, events: [...st.events, { type: "win" }], changed: true };
    case "lose":
      return st.events.some((e) => e.type === "lose") ? st : { ...st, events: [...st.events, { type: "lose" }], changed: true };
    case "toggleAppliance": {
      const e = st.entities[a.entityId];
      const app = e?.components.appliance;
      if (!e || !app) return st;
      return {
        ...st,
        entities: { ...st.entities, [a.entityId]: { ...e, components: { ...e.components, appliance: { ...app, on: !app.on } } } },
        changed: true,
      };
    }
    case "setOpenable": {
      const had = st.entities[a.entityId]?.components.openable;
      mutate(a.entityId, (e) =>
        e.components.openable
          ? { ...e, components: { ...e.components, openable: { open: a.open } } }
          : e,
      );
      if (had && had.open !== a.open) st.events = [...st.events, { type: "doorToggled", entityId: a.entityId, open: a.open }];
      return st;
    }
    case "mixHolder": {
      const e = st.entities[a.entityId];
      const holder = e?.components.holder;
      if (!e || !holder || holder.held.length < 2) return st;
      const prep = holder.held
        .map((hid) => st.entities[hid]?.components.ingredient)
        .filter((i): i is NonNullable<typeof i> => !!i)
        .map((i) => ({ type: i.type, state: i.state }));
      if (prep.length < 2) return st;
      const dish = resolveDish(def.recipes ?? [], prep);
      if (!dish) return st;
      return {
        ...st,
        entities: { ...st.entities, [a.entityId]: { ...e, components: { ...e.components, holder: { ...holder, dish } } } },
        events: [...st.events, { type: "dishMade", dish }],
        changed: true,
      };
    }
    case "prefabAction": {
      if (depth > 2) return st; // workstation → nested part → step (no deeper)
      const instance = st.entities[a.entityId];
      const pi = instance?.components.prefabInstance;
      const prefab = pi && (def.prefabs ?? []).find((p) => p.id === pi.prefabId);
      const action = prefab?.actions?.find((x) => x.id === a.actionId);
      if (!prefab || !action) return st;
      for (const step of action.steps) {
        const remapped = "entityId" in step
          ? ({ ...step, entityId: instanceEntityId(a.entityId, step.entityId, prefab.rootId) } as TriggerAction)
          : step;
        const next = applyTriggerAction(st, def, remapped, depth + 1);
        if (next) st = next;
      }
      return st;
    }
    default:
      return st;
  }
}
