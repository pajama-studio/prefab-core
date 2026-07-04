import type { Components, EntityDef, Prefab, Trigger } from "./types";
import {
  SEP,
  instanceEntityId,
  parseInstanceId,
  expandPrefabInstance as kitExpandInstance,
  expandEntities as kitExpandEntities,
  type ExpandOptions,
} from "../prefab-kit";

/**
 * Kitchen Lab's adapter over the standalone prefab-kit framework
 * (`src/lib/prefab-kit` — see its README). The kit owns expansion (instances,
 * per-instance overrides, exposed params, recursive nesting, depth cap); this
 * module binds it to the kitchen domain:
 * - the `remapComponentRefs` hook scopes kitchen-owned cross-entity refs
 *   (a knob's `controls` burner) into each instance,
 * - trigger remapping stays here (Trigger is a kitchen type the kit stores
 *   opaquely).
 * Public API unchanged — every existing consumer/test keeps working.
 */

export { SEP, instanceEntityId, parseInstanceId };

/** Kitchen cross-entity refs living inside components: a knob's `controls`
 *  target is prefab-local — scope it to the instance. */
const KITCHEN_OPTS: ExpandOptions<Components> = {
  remapComponentRefs: (components, mapId) => {
    const controls = components.appliance?.knob?.controls;
    if (!controls) return components;
    return {
      ...components,
      appliance: { ...components.appliance!, knob: { ...components.appliance!.knob!, controls: mapId(controls) } },
    };
  },
};

/** Expand one prefab instance entity into its game-visible sub-tree. */
export function expandPrefabInstance(instance: EntityDef, prefab: Prefab | undefined): EntityDef[] {
  return kitExpandInstance<Components, EntityDef>(instance, prefab, KITCHEN_OPTS);
}

/** Expand every instance in a list (recursive, nested prefabs supported). */
export function expandEntities(entities: EntityDef[], prefabsById: Record<string, Prefab>): EntityDef[] {
  return kitExpandEntities<Components, EntityDef>(entities, prefabsById, KITCHEN_OPTS);
}

/** Remap a single id field from prefab-local to instance-scoped. */
const mapId = (instanceId: string, rootId: string) => (localId: string) =>
  instanceEntityId(instanceId, localId, rootId);

/**
 * Instance-scoped copy of a prefab's shared triggers: trigger ids are prefixed
 * with the instance id and every `entityId` reference is remapped, so each
 * instance's logic targets its own sub-entities.
 */
export function remapPrefabTriggers(prefab: Prefab, instanceId: string): Trigger[] {
  const m = mapId(instanceId, prefab.rootId);
  return (prefab.triggers ?? []).map((tr) => {
    const when = "entityId" in tr.when ? { ...tr.when, entityId: m(tr.when.entityId) } : tr.when;
    const action = "entityId" in tr.do ? { ...tr.do, entityId: m(tr.do.entityId) } : tr.do;
    return { id: `${instanceId}${SEP}${tr.id}`, when, do: action } as Trigger;
  });
}

/** All instance-scoped triggers contributed by the prefab instances in a list. */
export function collectInstanceTriggers(entities: EntityDef[], prefabsById: Record<string, Prefab>): Trigger[] {
  const out: Trigger[] = [];
  for (const e of entities) {
    const pi = e.components.prefabInstance;
    const prefab = pi && prefabsById[pi.prefabId];
    if (prefab) out.push(...remapPrefabTriggers(prefab, e.id));
  }
  return out;
}
