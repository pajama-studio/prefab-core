import type { GameDef } from "./types.js";

const EMPTY_ASSET = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };

export function createDefaultGameDef(): GameDef {
  return {
    id: "draft",
    name: "Untitled Kitchen",
    version: 1,
    grid: { cols: 6, rows: 4, cellSize: 1 },
    sim: { tickMs: 50 },
    // A Kitchen Lab starter: a stove/pot to cook in, a cutting board to prep on,
    // a mystery box for surprises, and a couple of ingredients to experiment with.
    entities: [
      {
        id: "stove-1",
        name: "Stove",
        assetRef: { ...EMPTY_ASSET },
        components: {
          transform: { position: { x: 2, y: 0, z: 1 }, rotationY: 0, scale: 1 },
          station: { stationType: "stove", accepts: ["ingredient"] },
          holder: { capacity: 4, held: [] },
          appliance: { on: false },
        },
      },
      {
        id: "board-1",
        name: "Cutting board",
        assetRef: { ...EMPTY_ASSET },
        components: {
          transform: { position: { x: 0, y: 0, z: 1 }, rotationY: 0, scale: 1 },
          station: { stationType: "cutting", accepts: ["ingredient"] },
          holder: { capacity: 2, held: [] },
        },
      },
      {
        id: "box-1",
        name: "Mystery box",
        assetRef: { ...EMPTY_ASSET },
        components: {
          transform: { position: { x: 4, y: 0, z: 3 }, rotationY: 0, scale: 1 },
          station: { stationType: "mystery", accepts: [] },
          vfx: { kind: "sparkle", on: true },
        },
      },
      {
        id: "tomato-1",
        name: "Tomato",
        assetRef: { ...EMPTY_ASSET },
        components: {
          transform: { position: { x: 1, y: 0, z: 3 }, rotationY: 0, scale: 1 },
          ingredient: { type: "tomato", state: "whole" },
        },
      },
      {
        id: "egg-1",
        name: "Egg",
        assetRef: { ...EMPTY_ASSET },
        components: {
          transform: { position: { x: 2, y: 0, z: 3 }, rotationY: 0, scale: 1 },
          ingredient: { type: "egg", state: "whole" },
        },
      },
    ],
    // The recipe book: known dishes appear in the codex; hidden ones only show
    // once discovered. Cook the combination in the stove to find them.
    recipes: [
      { id: "rcp-omelette", name: "Tomato Omelette", inputs: [{ type: "tomato" }, { type: "egg" }], output: "Tomato Omelette" },
      { id: "rcp-secret", name: "Secret", inputs: [{ type: "tomato", state: "diced" }, { type: "fish" }], output: "Sushi Surprise", hidden: true },
      // "water" comes from a FULL fillable pot — fill it under a faucet first.
      { id: "rcp-soup", name: "Soup", inputs: [{ type: "tomato", state: "diced" }, { type: "water" }], output: "Tomato Soup", hidden: true },
    ],
    triggers: [],
  };
}
