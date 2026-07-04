import { describe, it, expect } from "vitest";
import { inputSystem } from "../../engine/systems/input";
import { timerSystem } from "../../engine/systems/timer";
import { stateSystem } from "../../engine/systems/state";
import type { EngineState } from "../../engine/types";

const base = (entities: EngineState["entities"]): EngineState => ({
  def: { id: "t", name: "t", version: 1, grid: { cols: 1, rows: 1, cellSize: 1 }, sim: { tickMs: 50 }, entities: [], recipes: [] },
  timeMs: 0, events: [], score: 0, hand: null, discovered: [], entities,
});
const ref = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };

describe("inputSystem", () => {
  it("toggles cookable.active", () => {
    const s = base({ p: { id: "p", name: "p", assetRef: ref, components: { cookable: { state: "raw", cookSec: 4, burnSec: 8, elapsedSec: 0, active: false } } } });
    const next = inputSystem.step(s, 0, [{ type: "toggleCook", entityId: "p" }]);
    expect(next.entities.p.components.cookable!.active).toBe(true);
  });
});

describe("timerSystem", () => {
  it("emits timerComplete when crossing duration", () => {
    const s = base({ t: { id: "t", name: "t", assetRef: ref, components: { timer: { durationSec: 2, elapsedSec: 1.5, onComplete: "ding" } } } });
    const next = timerSystem.step(s, 1000, []);
    expect(next.events).toContainEqual({ type: "timerComplete", entityId: "t", onComplete: "ding" });
  });
});

describe("stateSystem", () => {
  it("syncs stateful.current from cookable.state", () => {
    const s = base({ p: { id: "p", name: "p", assetRef: ref, components: { cookable: { state: "cooked", cookSec: 4, burnSec: 8, elapsedSec: 5, active: true }, stateful: { current: "raw", states: [] } } } });
    const next = stateSystem.step(s, 0, []);
    expect(next.entities.p.components.stateful!.current).toBe("cooked");
  });
});

describe("pocket inventory (roadmap 6/7)", () => {
  it("stows the hand item, swaps with slot contents, unstows to hand", async () => {
    const { createEngine, step } = await import("../engine");
    const { createDefaultGameDef } = await import("../defaults");
    const asset = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };
    const T = { position: { x: 0, y: 0, z: 0 }, rotationY: 0, scale: 1 };
    const def = {
      ...createDefaultGameDef(),
      entities: [
        { id: "apple", name: "Apple", assetRef: asset, components: { transform: T, ingredient: { type: "tomato", state: "whole" } } },
        { id: "pear", name: "Pear", assetRef: asset, components: { transform: T, ingredient: { type: "potato", state: "whole" } } },
      ],
    };
    let s = createEngine(def);
    s = step(s, 50, [{ type: "interact", entityId: "apple" }]);   // pick up
    expect(s.hand).toBe("apple");
    s = step(s, 50, [{ type: "pocket", slot: 0 }]);               // stow
    expect(s.hand).toBeNull();
    expect(s.pockets![0]).toBe("apple");
    s = step(s, 50, [{ type: "interact", entityId: "pear" }]);    // pick up another
    s = step(s, 50, [{ type: "pocket", slot: 0 }]);               // swap
    expect(s.hand).toBe("apple");
    expect(s.pockets![0]).toBe("pear");
    s = step(s, 50, [{ type: "pocket", slot: 1 }]);               // stow apple in slot 2
    s = step(s, 50, [{ type: "pocket", slot: 1 }]);               // unstow back
    expect(s.hand).toBe("apple");
    expect(s.pockets![1]).toBeNull();
  });
});
