import type { System } from "./engine/system.js";
import { CORE_SYSTEMS } from "./engine/engine.js";
import { registerActionHandler } from "./engine/systems/actions.js";
import type { ComponentDoc } from "./catalog.js";

/**
 * THE DOMAIN PACK PROTOCOL — how any game turns "components + logic +
 * assets" into prefabs.
 *
 * A domain implements ONE object:
 *   · components — its component vocabulary, documented for agents/editors
 *     (semantic doc, player verbs, invariants — the Agent Catalog pattern);
 *   · systems    — its behavior pipeline (pure step functions);
 *   · actions    — handlers for its trigger-action kinds;
 *   · validate/migrate — its contract maintenance (optional);
 *   · resolveAsset — how its asset refs resolve (optional, host-injectable).
 *
 * In return the domain gets the whole framework: the deterministic engine
 * (assembleSystems → createEngine/step), prefab templates/instances/params/
 * actions (schema/), any PrefabStore (memory/web/REST/D1), editor bindings
 * (prefab-studio renders from the catalog), and generated agent docs.
 */
export interface DomainPack {
  id: string;
  /** Component vocabulary docs — merged into catalog() output. */
  components?: Record<string, ComponentDoc>;
  /** Behavior pipeline, run BEFORE the core systems (timers/state/triggers). */
  systems: System[];
  /** Trigger-action handlers for this domain's action kinds. */
  actions?: Record<string, (st: never, def: never, a: never) => never>;
  /** Domain-specific structural validation (beyond schema validatePrefab). */
  validate?: (prefab: unknown) => string[];
  /** Version migration for this domain's component data. */
  migrate?: (prefab: unknown, fromVersion: number) => unknown;
  /** Asset reference resolution (models/sounds/textures) — host-injectable. */
  resolveAsset?: (ref: { modelUrl?: string | null }) => { modelUrl?: string | null };
}

/** Declare a domain pack (identity helper: typing + a place for future
 *  registration invariants). */
export function definePack(pack: DomainPack): DomainPack {
  return pack;
}

const installed = new Set<string>();

/** Assemble the engine pipeline from domain packs: pack systems run in the
 *  given order, then the core systems (timer/state/prefabAction/trigger).
 *  Registers each pack's action handlers exactly once. */
export function assembleSystems(packs: DomainPack[]): System[] {
  for (const p of packs) {
    if (installed.has(p.id)) continue;
    installed.add(p.id);
    for (const [kind, handler] of Object.entries(p.actions ?? {})) {
      registerActionHandler(kind, handler as never);
    }
  }
  return [...packs.flatMap((p) => p.systems), ...CORE_SYSTEMS];
}
