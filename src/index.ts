/** @pajama-studio/prefab-core — the pure-TS prefab engine.
 *  Schema + component systems + deterministic step(); zero DOM/Three deps. */
export * from "./engine/types";
export { createEngine, step } from "./engine/engine";
export { migrateDef } from "./engine/migrate";
export { createDefaultGameDef } from "./engine/defaults";
export { catchTarget, fluidSystem, POUR_RATE, CATCH_RADIUS } from "./engine/systems/fluid";
export { getIngredient, cutState } from "./game/ingredients";
// prefab-kit re-exports name-clash with engine/types (Transform, PrefabParam…)
// — consumers import the kit namespace explicitly.
export * as prefabKit from "./prefab-kit";
