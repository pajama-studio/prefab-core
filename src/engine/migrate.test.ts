import { describe, it, expect } from "vitest";
import { migrateDef } from "../engine/migrate.js";

describe("migrateDef", () => {
  it("upgrades an old {x,y} transform to position/rotationY/scale using cellSize", () => {
    const old = {
      id: "g", name: "g", version: 1, grid: { cols: 6, rows: 4, cellSize: 2 }, sim: { tickMs: 50 },
      entities: [{ id: "e", name: "e", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null },
        components: { transform: { x: 3, y: 1 } } }],
      recipes: [],
    };
    const next = migrateDef(old) as any;
    expect(next.entities[0].components.transform).toEqual({ position: { x: 6, y: 0, z: 2 }, rotationY: 0, scale: 1 });
  });

  it("leaves an already-new transform untouched", () => {
    const t = { position: { x: 1, y: 0, z: 2 }, rotationY: 0, scale: 1 };
    const def = { id: "g", name: "g", version: 1, grid: { cols: 6, rows: 4, cellSize: 1 }, sim: { tickMs: 50 },
      entities: [{ id: "e", name: "e", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { transform: t } }], recipes: [] };
    const next = migrateDef(def) as any;
    expect(next.entities[0].components.transform).toEqual(t);
  });

  it("leaves entities without a transform untouched", () => {
    const def = { id: "g", name: "g", version: 1, grid: { cols: 6, rows: 4, cellSize: 1 }, sim: { tickMs: 50 },
      entities: [{ id: "e", name: "e", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: {} }], recipes: [] };
    expect(() => migrateDef(def)).not.toThrow();
  });
});
