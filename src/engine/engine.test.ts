import { describe, it, expect } from "vitest";
import { createEngine, step } from "../engine/engine";
import { createDefaultGameDef } from "../engine/defaults";
import type { GameDef } from "../engine/types";

/** A self-contained def with one cookable entity (decoupled from the default). */
function cookableDef(): GameDef {
  return {
    id: "t", name: "t", version: 1, grid: { cols: 1, rows: 1, cellSize: 1 }, sim: { tickMs: 50 },
    entities: [{
      id: "p", name: "P", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null },
      components: {
        cookable: { state: "raw", cookSec: 2, burnSec: 6, elapsedSec: 0, active: false },
        stateful: { current: "raw", states: [{ key: "raw", tint: "#e8a0a0" }, { key: "cooked", tint: "#8a5a2b" }] },
      },
    }],
    recipes: [], triggers: [],
  };
}

describe("engine", () => {
  it("createEngine maps entities and starts at t=0", () => {
    const s = createEngine(createDefaultGameDef());
    expect(s.timeMs).toBe(0);
    expect(s.entities["stove-1"]).toBeDefined();
  });

  it("is deterministic: same def + inputs => identical state", () => {
    const def = cookableDef();
    const a = step(createEngine(def), 5000, [{ type: "toggleCook", entityId: "p" }]);
    const b = step(createEngine(def), 5000, [{ type: "toggleCook", entityId: "p" }]);
    expect(a).toEqual(b);
  });

  it("cooking advances over a step and syncs stateful", () => {
    const s = step(createEngine(cookableDef()), 5000, [{ type: "toggleCook", entityId: "p" }]);
    expect(s.entities.p.components.cookable!.state).toBe("cooked");
    expect(s.entities.p.components.stateful!.current).toBe("cooked");
    expect(s.timeMs).toBe(5000);
  });
});
