import { describe, it, expect } from "vitest";
import { expandPrefabInstance, remapPrefabTriggers, parseInstanceId, expandEntities, collectInstanceTriggers } from "./prefab.js";
import { resolveWorldTransform } from "./transform.js";
import type { EntityDef, Prefab, Transform } from "./types.js";

const T = (x: number, y: number, z: number, rotationY = 0, scale = 1): Transform =>
  ({ position: { x, y, z }, rotationY, scale });
const asset = { id: "a", slug: "a", thumbnailUrl: null, modelUrl: null };

// A stove prefab: root "stove" + a knob attached at offset (0.5,0,0).
const prefab: Prefab = {
  id: "p", name: "Stove", version: 3, rootId: "stove",
  entities: [
    { id: "stove", name: "Stove", assetRef: asset, components: { transform: T(0, 0, 0), appliance: { on: false } } },
    { id: "knob", name: "Knob", assetRef: asset, components: { transform: T(0.5, 0, 0), attach: { parentId: "stove", offset: T(0.5, 0, 0) } } },
  ],
  triggers: [{ id: "t1", when: { kind: "cookableState", entityId: "knob", state: "x" }, do: { kind: "setStateful", entityId: "knob", key: "on" } }],
};

const instance = (overrides = {}): EntityDef => ({
  id: "i1", name: "Stove", assetRef: asset,
  components: { transform: T(10, 0, 0, 0, 2), prefabInstance: { prefabId: "p", version: 3, overrides } },
});

describe("expandPrefabInstance", () => {
  it("root becomes the instance entity with its world transform + marker", () => {
    const out = expandPrefabInstance(instance(), prefab);
    const root = out.find((e) => e.id === "i1")!;
    expect(root.components.transform).toEqual(T(10, 0, 0, 0, 2));
    expect(root.components.appliance).toEqual({ on: false }); // from prefab
    expect(root.components.prefabInstance?.prefabId).toBe("p");
    expect(root.components.attach).toBeUndefined();
  });

  it("child gets an instance-scoped id, attached under the root, and rides it", () => {
    const out = expandPrefabInstance(instance(), prefab);
    const knob = out.find((e) => e.id === "i1::knob")!;
    expect(knob.components.attach?.parentId).toBe("i1");
    const byId = Object.fromEntries(out.map((e) => [e.id, e]));
    // instance root world scale 2 at x=10; knob offset 0.5 → world x = 10 + 2*0.5 = 11
    expect(resolveWorldTransform("i1::knob", byId).position.x).toBeCloseTo(11, 6);
  });

  it("per-instance override merges over the prefab component", () => {
    const out = expandPrefabInstance(instance({ knob: { components: { pickable: false } } }), prefab);
    expect(out.find((e) => e.id === "i1::knob")!.components.pickable).toBe(false);
  });

  it("a removed override drops the sub-entity", () => {
    const out = expandPrefabInstance(instance({ knob: { removed: true } }), prefab);
    expect(out.find((e) => e.id === "i1::knob")).toBeUndefined();
    expect(out.find((e) => e.id === "i1")).toBeDefined();
  });

  it("remaps a knob's cross-entity `controls` target to the instance scope", () => {
    const kp: Prefab = {
      id: "k", name: "Stove", version: 1, rootId: "body",
      entities: [
        { id: "body", name: "Body", assetRef: asset, components: { transform: T(0, 0, 0), appliance: { on: false } } },
        { id: "dial", name: "Dial", assetRef: asset, components: { transform: T(0.5, 0, 0), attach: { parentId: "body", offset: T(0.5, 0, 0) }, appliance: { on: false, knob: { axis: "y", angle: 90, controls: "body" } } } },
      ],
    };
    const inst: EntityDef = { id: "i9", name: "Stove", assetRef: asset, components: { transform: T(0, 0, 0), prefabInstance: { prefabId: "k", version: 1, overrides: {} } } };
    const out = expandPrefabInstance(inst, kp);
    // dial controls "body" (the root) → remapped to the instance id itself
    expect(out.find((e) => e.id === "i9::dial")!.components.appliance!.knob!.controls).toBe("i9");
  });

  it("does not crash when the prefab's rootId matches no entity", () => {
    const broken: Prefab = { ...prefab, rootId: "ghost-root" };
    expect(() => expandPrefabInstance(instance(), broken)).not.toThrow();
    // still yields the (non-root) parts; just no derived root entity
    const out = expandPrefabInstance(instance(), broken);
    expect(Array.isArray(out)).toBe(true);
  });

  it("returns [] for a non-instance entity or a missing prefab", () => {
    expect(expandPrefabInstance({ id: "x", name: "x", assetRef: asset, components: {} }, prefab)).toEqual([]);
    expect(expandPrefabInstance(instance(), undefined)).toEqual([]);
  });
});

describe("expandEntities", () => {
  const plain: EntityDef = { id: "floor", name: "Floor", assetRef: asset, components: { transform: T(0, 0, 0) } };

  it("expands instances and leaves plain entities untouched", () => {
    const out = expandEntities([plain, instance()], { p: prefab });
    expect(out.map((e) => e.id).sort()).toEqual(["floor", "i1", "i1::knob"]);
  });

  it("keeps the instance entity as a placeholder when its prefab is missing", () => {
    const out = expandEntities([instance()], {});
    expect(out.map((e) => e.id)).toEqual(["i1"]);
  });

  it("collectInstanceTriggers gathers per-instance scoped triggers", () => {
    const trigs = collectInstanceTriggers([plain, instance()], { p: prefab });
    expect(trigs.map((t) => t.id)).toEqual(["i1::t1"]);
  });
});

describe("nested prefab expansion", () => {
  // Prefab B: a knob assembly (root + one part).
  const B: Prefab = {
    id: "B", name: "KnobAsm", version: 1, rootId: "base",
    entities: [
      { id: "base", name: "Base", assetRef: asset, components: { transform: T(0, 0, 0) } },
      { id: "dial", name: "Dial", assetRef: asset, components: { transform: T(0.2, 0, 0), attach: { parentId: "base", offset: T(0.2, 0, 0) }, appliance: { on: false } } },
    ],
  };
  // Prefab A: a stove whose template CONTAINS an instance of B, riding the root.
  const A: Prefab = {
    id: "A", name: "Stove", version: 1, rootId: "body",
    entities: [
      { id: "body", name: "Body", assetRef: asset, components: { transform: T(0, 0, 0) } },
      { id: "asm", name: "Asm", assetRef: asset, components: {
        transform: T(1, 0, 0),
        attach: { parentId: "body", offset: T(1, 0, 0) },
        prefabInstance: { prefabId: "B", version: 1, overrides: {} },
      } },
    ],
  };
  const lib = { A, B };
  const instA: EntityDef = { id: "i1", name: "Stove", assetRef: asset,
    components: { transform: T(10, 0, 0), prefabInstance: { prefabId: "A", version: 1, overrides: {} } } };

  it("expands recursively: the nested instance's parts appear and ride the chain", () => {
    const out = expandEntities([instA], lib);
    const ids = out.map((e) => e.id).sort();
    expect(ids).toEqual(["i1", "i1::asm", "i1::asm::dial"]);
    const byId = Object.fromEntries(out.map((e) => [e.id, e]));
    // dial world x = outer(10) + asm offset(1) + dial offset(0.2)
    expect(resolveWorldTransform("i1::asm::dial", byId).position.x).toBeCloseTo(11.2, 5);
  });

  it("outer overrides addressed into the nested tree flow down", () => {
    const withOv: EntityDef = { ...instA, components: { ...instA.components,
      prefabInstance: { prefabId: "A", version: 1, overrides: { "asm::dial": { components: { appliance: { on: true } } } } } } };
    const out = expandEntities([withOv], lib);
    const dial = out.find((e) => e.id === "i1::asm::dial")!;
    expect(dial.components.appliance).toEqual({ on: true });
  });

  it("a self-containing prefab is depth-capped, never loops", () => {
    const evil: Prefab = {
      id: "E", name: "Evil", version: 1, rootId: "r",
      entities: [
        { id: "r", name: "R", assetRef: asset, components: { transform: T(0, 0, 0) } },
        { id: "child", name: "C", assetRef: asset, components: { transform: T(1, 0, 0), prefabInstance: { prefabId: "E", version: 1 } } },
      ],
    };
    const inst: EntityDef = { id: "x", name: "E", assetRef: asset,
      components: { transform: T(0, 0, 0), prefabInstance: { prefabId: "E", version: 1 } } };
    let out: EntityDef[] = [];
    expect(() => { out = expandEntities([inst], { E: evil }); }).not.toThrow();
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThan(50); // bounded by MAX_NESTING
  });
});

describe("remapPrefabTriggers / parseInstanceId", () => {
  it("scopes trigger ids and entity references to the instance", () => {
    const [tr] = remapPrefabTriggers(prefab, "i1");
    expect(tr.id).toBe("i1::t1");
    expect((tr.when as { entityId: string }).entityId).toBe("i1::knob");
    expect((tr.do as { entityId: string }).entityId).toBe("i1::knob");
  });

  it("parses derived ids and rejects plain ids", () => {
    expect(parseInstanceId("i1::knob")).toEqual({ instanceId: "i1", localId: "knob" });
    expect(parseInstanceId("plain")).toBeNull();
  });
});
