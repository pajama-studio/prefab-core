/**
 * Kitchen Lab ingredient catalog + state machine (design doc W3).
 *
 * Each ingredient is a small state machine. Cutting advances along the prep
 * chain (whole → cut → diced …); cooking takes any prep stage to `cooked`, then
 * `burnt`. Each state binds a real low-poly model from the asset library (with
 * an optional tint for cooked/burnt), so a state change just swaps the model.
 *
 * Pure data + helpers — no Three.js / React here.
 */
const PACK = "https://assets.pajama.studio/packs/kitchen";
const lp = (name: string) => `${PACK}/lowpoly-food/${name}.glb`;

export interface IngredientState {
  key: string;
  label: string;
  modelUrl: string;
  /** Optional colour wash for cooked/burnt stages (multiplied onto the model). */
  tint?: string;
}

export type Rarity = "common" | "rare" | "legendary";

export interface IngredientDef {
  id: string;
  name: string;
  emoji: string;
  /** Drop rarity from the mystery box (rarer ingredients appear less often). */
  rarity: Rarity;
  /** Prep stages reachable by cutting, in order (index 0 is the initial state). */
  cutOrder: string[];
  states: Record<string, IngredientState>;
}

export const INGREDIENTS: IngredientDef[] = [
  {
    id: "tomato", name: "Tomato", emoji: "🍅", rarity: "common", cutOrder: ["whole", "cut", "diced"],
    states: {
      whole: { key: "whole", label: "Whole", modelUrl: lp("tomato") },
      cut: { key: "cut", label: "Cut", modelUrl: lp("tomatoHalf") },
      diced: { key: "diced", label: "Diced", modelUrl: lp("tomatoEighth") },
      cooked: { key: "cooked", label: "Cooked", modelUrl: lp("tomatoEighth"), tint: "#a23b1f" },
      burnt: { key: "burnt", label: "Burnt", modelUrl: lp("tomatoEighth"), tint: "#241a15" },
    },
  },
  {
    id: "potato", name: "Potato", emoji: "🥔", rarity: "common", cutOrder: ["whole", "diced"],
    states: {
      whole: { key: "whole", label: "Whole", modelUrl: lp("potato") },
      diced: { key: "diced", label: "Diced", modelUrl: lp("potatoEighth") },
      cooked: { key: "cooked", label: "Cooked", modelUrl: lp("potatoEighth"), tint: "#c9a24a" },
      burnt: { key: "burnt", label: "Burnt", modelUrl: lp("potatoEighth"), tint: "#2b2118" },
    },
  },
  {
    id: "onion", name: "Onion", emoji: "🧅", rarity: "common", cutOrder: ["whole", "chopped", "rings"],
    states: {
      whole:   { key: "whole",   label: "Whole",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_onion.glb` },
      chopped: { key: "chopped", label: "Chopped", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_onion_chopped.glb` },
      rings:   { key: "rings",   label: "Rings",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_onion_rings.glb` },
      cooked:  { key: "cooked",  label: "Cooked",  modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_onion_rings.glb`, tint: "#b07b3a" },
      burnt:   { key: "burnt",   label: "Burnt",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_onion_rings.glb`, tint: "#241a15" },
    },
  },
  {
    id: "egg", name: "Egg", emoji: "🥚", rarity: "common", cutOrder: ["whole"],
    states: {
      whole: { key: "whole", label: "Whole", modelUrl: `${PACK}/styloo-food-kitchen/egg.glb` },
      cooked: { key: "cooked", label: "Cooked", modelUrl: `${PACK}/styloo-food-kitchen/egg.glb`, tint: "#f3e7b0" },
      burnt: { key: "burnt", label: "Burnt", modelUrl: `${PACK}/styloo-food-kitchen/egg.glb`, tint: "#5a4632" },
    },
  },
  {
    id: "steak", name: "Steak", emoji: "🥩", rarity: "legendary", cutOrder: ["whole", "diced"],
    states: {
      whole: { key: "whole", label: "Whole", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_steak.glb` },
      diced: { key: "diced", label: "Diced", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_steak_pieces.glb` },
      cooked: { key: "cooked", label: "Cooked", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_steak_pieces.glb`, tint: "#6b3a22" },
      burnt: { key: "burnt", label: "Burnt", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_steak_pieces.glb`, tint: "#241712" },
    },
  },
  {
    id: "fish", name: "Fish", emoji: "🐟", rarity: "rare", cutOrder: ["whole", "cut"],
    states: {
      whole: { key: "whole", label: "Whole", modelUrl: lp("salmon") },
      cut: { key: "cut", label: "Fillet", modelUrl: lp("salmonFillet") },
      cooked: { key: "cooked", label: "Cooked", modelUrl: lp("salmonFillet"), tint: "#d98c6a" },
      burnt: { key: "burnt", label: "Burnt", modelUrl: lp("salmonFillet"), tint: "#241712" },
    },
  },
  {
    id: "lettuce", name: "Lettuce", emoji: "🥬", rarity: "common", cutOrder: ["whole", "chopped"],
    states: {
      whole:   { key: "whole",   label: "Whole",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_lettuce.glb` },
      chopped: { key: "chopped", label: "Chopped", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_lettuce_chopped.glb` },
      cooked:  { key: "cooked",  label: "Wilted",  modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_lettuce_chopped.glb`, tint: "#7a8a3a" },
      burnt:   { key: "burnt",   label: "Burnt",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_lettuce_chopped.glb`, tint: "#241a15" },
    },
  },
  {
    id: "cheese", name: "Cheese", emoji: "🧀", rarity: "common", cutOrder: ["whole", "slice"],
    states: {
      whole: { key: "whole", label: "Wheel", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_cheese.glb` },
      slice: { key: "slice", label: "Slice", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_cheese_slice.glb` },
      cooked: { key: "cooked", label: "Melted", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_cheese_slice.glb`, tint: "#e8a13c" },
      burnt: { key: "burnt", label: "Burnt", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_cheese_slice.glb`, tint: "#2b2118" },
    },
  },
  {
    id: "carrot", name: "Carrot", emoji: "🥕", rarity: "common", cutOrder: ["whole", "chopped", "pieces"],
    states: {
      whole:   { key: "whole",   label: "Whole",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_carrot.glb` },
      chopped: { key: "chopped", label: "Chopped", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_carrot_chopped.glb` },
      pieces:  { key: "pieces",  label: "Pieces",  modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_carrot_pieces.glb` },
      cooked:  { key: "cooked",  label: "Cooked",  modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_carrot_pieces.glb`, tint: "#b56a2a" },
      burnt:   { key: "burnt",   label: "Burnt",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_carrot_pieces.glb`, tint: "#241a15" },
    },
  },
  {
    id: "bread", name: "Bread", emoji: "🍞", rarity: "common", cutOrder: ["whole", "sliced"],
    states: {
      whole:  { key: "whole",  label: "Bun",       modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_bun.glb` },
      sliced: { key: "sliced", label: "Split bun", modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_bun_bottom.glb` },
      cooked: { key: "cooked", label: "Toasted",   modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_bun.glb`, tint: "#b57e3f" },
      burnt:  { key: "burnt",  label: "Burnt",     modelUrl: `${PACK}/kaykit-restaurant/food_ingredient_bun.glb`, tint: "#2b2118" },
    },
  },
  {
    id: "milk", name: "Milk", emoji: "🥛", rarity: "common", cutOrder: ["whole"],
    states: {
      whole:  { key: "whole",  label: "Carton",  modelUrl: `${PACK}/kloworks-food/Milk_Pack.glb` },
      cooked: { key: "cooked", label: "Warmed",  modelUrl: `${PACK}/kloworks-food/Milk_Pack.glb`, tint: "#f3e7c8" },
      burnt:  { key: "burnt",  label: "Curdled", modelUrl: `${PACK}/kloworks-food/Milk_Pack.glb`, tint: "#8a7a52" },
    },
  },
  {
    // No butter mesh exists in the library — a pale-tinted flat cheese slice
    // reads as a butter pat in the toon style (workflow: substitute > invent).
    id: "butter", name: "Butter", emoji: "🧈", rarity: "common", cutOrder: ["whole"],
    states: {
      whole:  { key: "whole",  label: "Pat",     modelUrl: `${PACK}/kitchen-fast-food/obj-cheese.glb`, tint: "#ffe9a8" },
      cooked: { key: "cooked", label: "Melted",  modelUrl: `${PACK}/kitchen-fast-food/obj-cheese.glb`, tint: "#e8c063" },
      burnt:  { key: "burnt",  label: "Browned", modelUrl: `${PACK}/kitchen-fast-food/obj-cheese.glb`, tint: "#6b4a26" },
    },
  },
];

export function getIngredient(id: string): IngredientDef | undefined {
  return INGREDIENTS.find((d) => d.id === id);
}

export function ingredientState(id: string, state: string): IngredientState | undefined {
  return getIngredient(id)?.states[state];
}

/** Advance one cutting step along the prep chain (no-op past the last stage,
 *  or once cooked/burnt). */
export function cutState(id: string, state: string): string {
  const def = getIngredient(id);
  if (!def) return state;
  const i = def.cutOrder.indexOf(state);
  return i >= 0 && i < def.cutOrder.length - 1 ? def.cutOrder[i + 1] : state;
}

const RARITY_WEIGHT: Record<Rarity, number> = { common: 6, rare: 3, legendary: 1 };

/** Pick an ingredient id weighted by rarity. `rand` is a 0..1 value supplied by
 *  the caller (the engine stays deterministic — randomness lives at the UI). */
export function rollIngredient(rand: number): string {
  const total = INGREDIENTS.reduce((s, d) => s + RARITY_WEIGHT[d.rarity], 0);
  let r = Math.min(Math.max(rand, 0), 0.999999) * total;
  for (const d of INGREDIENTS) {
    if (r < RARITY_WEIGHT[d.rarity]) return d.id;
    r -= RARITY_WEIGHT[d.rarity];
  }
  return INGREDIENTS[INGREDIENTS.length - 1].id;
}

/** Apply heat: any prep stage → cooked → burnt. */
export function cookState(id: string, state: string): string {
  const def = getIngredient(id);
  if (!def) return state;
  if (state === "burnt") return "burnt";
  if (state === "cooked") return "burnt";
  if (def.cutOrder.includes(state)) return "cooked";
  return state;
}
