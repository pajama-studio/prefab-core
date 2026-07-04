import { describe, it, expect } from "vitest";
import { cookingSystem } from "../../engine/systems/cooking";
import type { EngineState } from "../../engine/types";

function stateWith(active: boolean, elapsedSec = 0): EngineState {
  return {
    def: { id: "t", name: "t", version: 1, grid: { cols: 1, rows: 1, cellSize: 1 }, sim: { tickMs: 50 }, entities: [], recipes: [] },
    timeMs: 0,
    events: [],
    score: 0,
    hand: null,
    discovered: [],
    entities: {
      p: {
        id: "p", name: "p", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null },
        components: { cookable: { state: "raw", cookSec: 4, burnSec: 8, elapsedSec, active } },
      },
    },
  };
}

describe("cookingSystem", () => {
  it("does not advance when inactive", () => {
    const next = cookingSystem.step(stateWith(false), 1000, []);
    expect(next.entities.p.components.cookable!.elapsedSec).toBe(0);
  });

  it("advances elapsedSec by dt when active", () => {
    const next = cookingSystem.step(stateWith(true), 1000, []);
    expect(next.entities.p.components.cookable!.elapsedSec).toBe(1);
  });

  it("becomes cooked at cookSec and burnt at burnSec", () => {
    expect(cookingSystem.step(stateWith(true, 3), 1500, []).entities.p.components.cookable!.state).toBe("cooked");
    expect(cookingSystem.step(stateWith(true, 7), 1500, []).entities.p.components.cookable!.state).toBe("burnt");
  });

  it("does not mutate the input state", () => {
    const s = stateWith(true);
    cookingSystem.step(s, 1000, []);
    expect(s.entities.p.components.cookable!.elapsedSec).toBe(0);
  });
});
