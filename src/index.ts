/** @pajama-studio/prefab-core — a GENERAL-PURPOSE prefab game runtime.
 *  Deterministic step() over pluggable system packs, trigger→action dispatch
 *  (extensible via registerActionHandler), timers/state machines/win-lose.
 *  Domain packs (like Pajama Studio's internal kitchen-kit) plug in on top.
 *  Zero DOM/Three deps. */
export * from "./engine/types.js";
export { createEngine, step, CORE_SYSTEMS } from "./engine/engine.js";
export type { System } from "./engine/system.js";
export { registerActionHandler } from "./engine/systems/actions.js";
export { isPickable } from "./engine/pickable.js";
export { migrateDef } from "./engine/migrate.js";
export { createDefaultGameDef } from "./engine/defaults.js";
// The Blueprint mechanism is its own published package — re-exported as a
// namespace for convenience (names clash with engine/types otherwise).
export * as prefabKit from "@pajama-studio/prefab-kit";
export { COMPONENT_CATALOG, ACTION_CATALOG, catalog } from "./catalog.js";
export type { ComponentDoc } from "./catalog.js";
