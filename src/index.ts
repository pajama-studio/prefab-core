/** @pajama-studio/prefab-core — the pure-TS prefab engine.
 *  Schema + component systems + deterministic step(); zero DOM/Three deps. */
export * from "./engine/types.js";
export { createEngine, step } from "./engine/engine.js";
export { migrateDef } from "./engine/migrate.js";
export { createDefaultGameDef } from "./engine/defaults.js";
export { catchTarget, fluidSystem, POUR_RATE, CATCH_RADIUS } from "./engine/systems/fluid.js";
export { getIngredient, cutState } from "./game/ingredients.js";
// The Blueprint mechanism is its own published package — re-exported as a
// namespace for convenience (names clash with engine/types otherwise).
export * as prefabKit from "@pajama-studio/prefab-kit";
export { COMPONENT_CATALOG, ACTION_CATALOG, catalog } from "./catalog.js";
export type { ComponentDoc } from "./catalog.js";
