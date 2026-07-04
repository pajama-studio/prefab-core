import type { System } from "./cooking";
import type { EngineState, GameEvent, IngredientReq, Recipe, RuntimeEntity } from "../types";

const COOK_SEC = 4;  // heat to cook the pot's contents
const BURN_SEC = 9;  // heat to ruin them

type Held = { type: string; state: string };

/** Does this pot's contents satisfy a recipe (multiset; each req matches an
 *  ingredient by type and, if specified, prep state)? */
export function recipeMatches(reqs: IngredientReq[], held: Held[]): boolean {
  if (reqs.length !== held.length) return false;
  const pool = [...held];
  for (const req of reqs) {
    const i = pool.findIndex((h) => h.type === req.type && (req.state === undefined || h.state === req.state));
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

/** Resolve the dish a pot of (prep'd) ingredients makes: the first matching
 *  recipe (hidden ones count), else a "Mystery" discovery named after the
 *  ingredients — experimentation always yields something to record. */
export function resolveDish(recipes: Recipe[], held: Held[]): string {
  if (!held.length) return "";
  const r = recipes.find((rc) => recipeMatches(rc.inputs, held));
  if (r) return r.output;
  const titled = held.map((h) => h.type[0].toUpperCase() + h.type.slice(1)).sort().join(" + ");
  return `Mystery: ${titled}`;
}

/**
 * Cooking pots/pans: while an appliance is `on` and holds ingredients, heat
 * accumulates. At COOK_SEC the combination resolves to a dish (from the prep
 * states, so "diced tomato + egg" is distinct) — recorded as a discovery the
 * first time — and the contents become `cooked`; past BURN_SEC they burn.
 */
export const cookingPotSystem: System = {
  id: "cookingPot",
  step(state, dtMs) {
    let entities = state.entities;
    let events = state.events;
    let discovered = state.discovered;
    let changed = false;

    for (const [id, e] of Object.entries(state.entities)) {
      const app = e.components.appliance;
      const held = e.components.holder?.held ?? [];
      // A FULL fillable pot contributes one virtual "water" ingredient — so a
      // recipe can require { type: "water" } (soup!), and even a water-only pot
      // boils into something discoverable.
      const fill = e.components.fillable;
      const hasWater = !!fill && fill.capacity > 0 && fill.level >= fill.capacity;
      if (!app?.on || (!held.length && !hasWater)) continue;

      const prevHeat = app.heatSec ?? 0;
      const heatSec = prevHeat + dtMs / 1000;
      const stage = heatSec >= BURN_SEC ? "burnt" : heatSec >= COOK_SEC ? "cooked" : "raw";
      const prevStage = prevHeat >= BURN_SEC ? "burnt" : prevHeat >= COOK_SEC ? "cooked" : "raw";

      entities = { ...entities, [id]: { ...e, components: { ...e.components, appliance: { ...app, heatSec } } } };
      changed = true;
      if (stage === prevStage) continue;

      // Resolve the dish from the PRE-cook prep states, then cook the contents.
      if (stage === "cooked") {
        const prep: Held[] = held
          .map((hid) => entities[hid]?.components.ingredient)
          .filter((i): i is NonNullable<typeof i> => !!i)
          .map((i) => ({ type: i.type, state: i.state }));
        if (hasWater) prep.push({ type: "water", state: "liquid" });
        const dish = resolveDish(state.def.recipes ?? [], prep);
        if (dish) {
          const cur = entities[id] as RuntimeEntity;
          const holder = cur.components.holder;
          entities = { ...entities, [id]: { ...cur, components: {
            ...cur.components,
            // The dish rides the holder (if any); the water is consumed by cooking.
            ...(holder ? { holder: { ...holder, dish } } : {}),
            ...(hasWater && fill ? { fillable: { ...fill, level: 0 } } : {}),
          } } };
          const ev: GameEvent[] = [{ type: "dishMade", dish }];
          if (!discovered.includes(dish)) {
            discovered = [...discovered, dish];
            ev.push({ type: "discovered", dish });
          }
          events = [...events, ...ev];
        }
      }

      for (const hid of held) {
        const he = entities[hid];
        const ing = he?.components.ingredient;
        if (!ing) continue;
        entities = { ...entities, [hid]: { ...he, components: { ...he.components, ingredient: { ...ing, state: stage } } } };
      }
    }

    return changed ? { ...state, entities, events, discovered } : state;
  },
};
