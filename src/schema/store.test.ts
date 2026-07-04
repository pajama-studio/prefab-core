import { describe, expect, it } from "vitest";
import { PACKAGE_FORMAT, PACKAGE_VERSION, type PrefabPackage } from "./serialize.js";
import { MemoryPrefabStore, prefabToPackage } from "./store.js";
import type { CoreComponents, KitPrefab } from "./types.js";

type AnyPrefab = KitPrefab<CoreComponents<never>>;

const prefab: AnyPrefab = {
  id: "external-chair",
  name: "External Chair",
  version: 3,
  rootId: "root",
  entities: [
    {
      id: "root",
      name: "Root",
      assetRef: {
        id: "",
        slug: "",
        thumbnailUrl: "https://cdn.example.com/chair.webp",
        modelUrl: "https://cdn.example.com/chair.glb",
      },
      components: {
        transform: { position: { x: 0, y: 0, z: 0 }, rotationY: 0, scale: 1 },
        primitive: { dims: { x: 1, y: 1, z: 1 }, mapUrl: "https://cdn.example.com/chair.png" },
      },
    },
  ],
};

const pkg: PrefabPackage = {
  format: PACKAGE_FORMAT,
  formatVersion: PACKAGE_VERSION,
  prefabs: [prefab],
  requirements: { packs: [{ id: "kitchen-kit", version: "0.0.0" }] },
};

describe("PrefabStore package contract", () => {
  it("round-trips a full package and keeps single-prefab compatibility helpers", async () => {
    const store = new MemoryPrefabStore();
    await store.savePackage(pkg, { visibility: "public" });

    expect(await store.list()).toEqual([
      {
        id: "external-chair",
        name: "External Chair",
        version: 3,
        visibility: "public",
      },
    ]);
    expect(await store.loadPackage("external-chair")).toMatchObject({
      format: PACKAGE_FORMAT,
      requirements: { packs: [{ id: "kitchen-kit", version: "0.0.0" }] },
      prefabs: [{ id: "external-chair" }],
      assets: [
        { entityId: "root", field: "assetRef.modelUrl", kind: "external", url: "https://cdn.example.com/chair.glb" },
        { entityId: "root", field: "assetRef.thumbnailUrl", kind: "external", url: "https://cdn.example.com/chair.webp" },
        { entityId: "root", field: "primitive.mapUrl", kind: "external", url: "https://cdn.example.com/chair.png" },
      ],
    });

    expect((await store.load("external-chair"))?.rootId).toBe("root");
    await store.save({ ...prefab, id: "single", name: "Single" });
    expect((await store.loadPackage("single"))?.prefabs[0].name).toBe("Single");
  });

  it("rejects unsafe external asset URLs on save", async () => {
    const store = new MemoryPrefabStore();
    const bad = prefabToPackage({
      ...prefab,
      id: "bad",
      entities: [
        {
          ...prefab.entities[0],
          assetRef: { ...prefab.entities[0].assetRef, modelUrl: "javascript:alert(1)" },
        },
      ],
    });

    await expect(store.savePackage(bad)).rejects.toThrow(/asset url/i);
  });
});
