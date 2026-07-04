import type { System } from "./cooking";
import type { Components, RuntimeEntity } from "../types";

const POINTS_PER_DISH = 100;

const isDelivery = (e: RuntimeEntity) => e.components.station?.stationType === "delivery";
/** Whether the player can pick this up. An explicit `pickable` flag wins;
 *  otherwise only food/container entities are dynamic — everything else
 *  (furniture, appliances, custom counters) stays fixed so it doesn't fall
 *  under gravity in play mode. Single source of truth for engine + UI + physics.
 *  To make a custom prop grabbable, set pickable:true in the Inspector. */
export const isPickable = (e: { components: Components }): boolean => {
  const c = e.components;
  if (typeof c.pickable === "boolean") return c.pickable;
  if (c.primitive) return false;
  if (c.station) return false;
  return !!(c.ingredient || c.cookable || c.holder || c.tool);
};
const isPortable = isPickable;
/** A carried thing that can be dropped INTO a holder.
 *  Any non-holder item qualifies — if it's already in hand it was already
 *  picked up, so re-checking isPickable here would block custom props.
 *  Holders themselves cannot be nested inside other holders. */
const isDroppable = (e?: RuntimeEntity) => !!e && !e.components.holder;

/**
 * Point-and-click "hand": clicking carries one entity. Click a portable item to
 * pick it; click a holder while carrying an ingredient to drop it in (a holder
 * whose contents match a menu recipe becomes that dish); put a carried item back
 * down on the floor with `place`; carry a plated dish to a delivery station to
 * serve it for points.
 */
export const interactSystem: System = {
  id: "interact",
  step(state, _dt, inputs) {
    const acts = inputs.filter((i) => i.type === "interact" || i.type === "place" || i.type === "pocket");
    if (!acts.length) return state;

    let entities = state.entities;
    let hand = state.hand;
    let pockets = state.pockets ?? [null, null, null];
    let score = state.score;
    let events = state.events;
    let changed = false;
    const set = (id: string, e: RuntimeEntity) => { entities = { ...entities, [id]: e }; changed = true; };

    for (const a of acts) {
      // Pocket slot N ↔ hand swap (stow / unstow / exchange).
      if (a.type === "pocket") {
        const i = a.slot;
        if (i < 0 || i >= pockets.length) continue;
        const inSlot = pockets[i];
        if (hand === null && inSlot === null) continue;
        // Only pocketable things go in (no holders-with-contents weirdness is
        // fine — the whole entity rides along, same as being in hand).
        if (hand !== null && !isPortable(entities[hand] ?? { components: {} })) continue;
        pockets = pockets.map((p, j) => (j === i ? hand : p));
        hand = inSlot;
        changed = true;
        continue;
      }
      // Put down: drop the held item at a world position and free the hand.
      if (a.type === "place") {
        if (hand === null) continue;
        const held = entities[hand];
        const tr = held.components.transform;
        set(hand, {
          ...held,
          components: {
            ...held.components,
            transform: { position: a.position, rotationY: tr?.rotationY ?? 0, scale: tr?.scale ?? 1 },
          },
        });
        hand = null;
        continue;
      }

      const tid = a.entityId;
      const target = entities[tid];
      if (!target) continue;

      // Empty hand → pick up a portable item.
      if (hand === null) {
        if (isPortable(target)) {
          hand = tid;
          changed = true;
          // If this item lived inside a holder, evict it so it isn't counted
          // as both "in hand" and "in holder" at the same time.
          for (const [hid, he] of Object.entries(entities)) {
            const h = he.components.holder;
            if (!h || !h.held.includes(tid)) continue;
            set(hid, { ...he, components: { ...he.components, holder: { ...h, held: h.held.filter((id) => id !== tid) } } });
            break;
          }
        }
        continue;
      }

      const held = entities[hand];

      // Deliver a plated dish.
      if (isDelivery(target)) {
        const dish = held?.components.holder?.dish;
        if (dish) {
          score += POINTS_PER_DISH;
          events = [...events, { type: "delivered", dish }, { type: "scoreChanged", total: score }];
          set(hand, { ...held, components: { ...held.components, holder: { ...held.components.holder!, held: [], dish: undefined } } });
          hand = null;
        }
        continue;
      }

      // Drop a carried ingredient into a holder on the board. The dish itself
      // forms later, in the pot (cookingPotSystem) — holders just hold.
      if (target.components.holder && tid !== hand && isDroppable(held)) {
        const h = target.components.holder;
        if (h.held.length < h.capacity) {
          set(tid, { ...target, components: { ...target.components, holder: { ...h, held: [...h.held, hand] } } });
          hand = null;
        }
        continue;
      }
    }

    return changed ? { ...state, entities, hand, pockets, score, events } : state;
  },
};
