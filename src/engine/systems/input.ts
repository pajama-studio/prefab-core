import type { System } from "./cooking.js";
import type { GameEvent } from "../types.js";
import { cutState, getIngredient } from "../../game/ingredients.js";

const EMPTY_ASSET = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };

export const inputSystem: System = {
  id: "input",
  step(state, _dt, inputs) {
    if (!inputs.length) return state;
    const entities = { ...state.entities };
    let changed = false;
    const doorEvents: GameEvent[] = [];
    const advanceCut = (eid: string) => {
      const en = entities[eid];
      const ing = en?.components.ingredient;
      if (!ing) return;
      const next = cutState(ing.type, ing.state);
      if (next === ing.state) return;
      entities[eid] = { ...en, components: { ...en.components, ingredient: { ...ing, state: next } } };
      changed = true;
    };
    for (const input of inputs) {
      if (input.type === "place") continue; // handled by interactSystem
      if (input.type === "shatter") {
        // Destruction: remove the source object, add each piece as a pickable,
        // cookable ingredient entity (its custom mesh lives in a runtime map).
        delete entities[input.sourceId];
        for (const pc of input.pieces) {
          entities[pc.id] = {
            id: pc.id,
            name: getIngredient(pc.type)?.name ?? "Piece",
            assetRef: { ...EMPTY_ASSET },
            components: {
              transform: { position: { x: pc.position.x, y: pc.position.y, z: pc.position.z }, rotationY: 0, scale: 1 },
              ingredient: { type: pc.type, state: pc.state },
            },
          };
        }
        changed = true;
        continue;
      }
      if (input.type === "pocket") continue; // handled by the interact system
      const e = entities[input.entityId];
      if (!e) continue;
      if (input.type === "toggleCook") {
        const c = e.components.cookable;
        if (!c) continue;
        entities[input.entityId] = { ...e, components: { ...e.components, cookable: { ...c, active: !c.active } } };
        changed = true;
      } else if (input.type === "toggleAppliance") {
        const a = e.components.appliance;
        if (!a) continue;
        const on = !a.on;
        entities[input.entityId] = { ...e, components: { ...e.components, appliance: { ...a, on } } };
        // A knob can drive a SEPARATE burner's on-state (front dial → top flame).
        const targetId = a.knob?.controls;
        const target = targetId ? entities[targetId] : undefined;
        if (targetId && target?.components.appliance) {
          entities[targetId] = { ...target, components: { ...target.components, appliance: { ...target.components.appliance, on } } };
        }
        changed = true;
      } else if (input.type === "toggleOpen") {
        const o = e.components.openable;
        if (!o) continue;
        entities[input.entityId] = { ...e, components: { ...e.components, openable: { open: !o.open } } };
        doorEvents.push({ type: "doorToggled", entityId: input.entityId, open: !o.open });
        changed = true;
      } else if (input.type === "toggleFluid") {
        const f = e.components.fluidSource;
        if (!f) continue;
        entities[input.entityId] = { ...e, components: { ...e.components, fluidSource: { ...f, on: !f.on } } };
        doorEvents.push({ type: "fluidToggled", entityId: input.entityId, on: !f.on });
        changed = true;
      } else if (input.type === "slice") {
        const s = e.components.sliceable;
        if (!s || s.cut) continue;
        entities[input.entityId] = { ...e, components: { ...e.components, sliceable: { ...s, cut: true } } };
        changed = true;
      } else if (input.type === "cut") {
        // Cut the ingredients on a cutting board (its held items), or the
        // targeted ingredient itself — one prep step (whole→cut→diced).
        const held = e.components.holder?.held;
        if (held?.length) held.forEach(advanceCut);
        else advanceCut(input.entityId);
      } else if (input.type === "spawn") {
        // Mystery box dispenses a fresh ingredient just in front of it. The
        // rolled type + id are supplied by the caller (engine stays pure).
        const bp = e.components.transform?.position ?? { x: 0, y: 0, z: 0 };
        entities[input.newId] = {
          id: input.newId,
          name: getIngredient(input.ingredientType)?.name ?? input.ingredientType,
          assetRef: { ...EMPTY_ASSET },
          components: {
            transform: { position: { x: bp.x, y: bp.y, z: bp.z + 0.9 }, rotationY: 0, scale: 1 },
            ingredient: { type: input.ingredientType, state: "whole" },
          },
        };
        changed = true;
      }
    }
    return changed ? { ...state, entities, events: doorEvents.length ? [...state.events, ...doorEvents] : state.events } : state;
  },
};
