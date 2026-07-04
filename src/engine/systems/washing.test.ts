import { describe, it, expect } from "vitest";
import { washingSystem } from "./washing";
import type { EngineState, RuntimeEntity } from "../types";

const asset = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };
const T = { position: { x: 0, y: 0, z: 0 }, rotationY: 0, scale: 1 };
const ent = (id: string, components: RuntimeEntity["components"]): RuntimeEntity =>
  ({ id, name: id, assetRef: asset, components: { transform: T, ...components } });

function stateWith(level: number, dirty = true, elapsed = 0): EngineState {
  return {
    entities: {
      basin: ent("basin", { holder: { capacity: 2, held: ["plate"], inside: true }, fillable: { liquid: "water", level, capacity: 3 } }),
      plate: ent("plate", { washable: { dirty, washSec: 3, elapsedSec: elapsed } }),
    },
    events: [], score: 0, tick: 0, elapsedMs: 0, status: "running",
  } as unknown as EngineState;
}

describe("washing system (roadmap 2/7)", () => {
  it("a dirty dish in a water-filled basin progresses and comes out clean", () => {
    let s = washingSystem.step(stateWith(2), 1000, []);
    expect(s.entities.plate.components.washable!.dirty).toBe(true);
    expect(s.entities.plate.components.washable!.elapsedSec).toBeCloseTo(1);
    s = washingSystem.step(stateWith(2, true, 2.5), 600, []);
    expect(s.entities.plate.components.washable!.dirty).toBe(false);
    expect(s.events.some((e) => e.type === "washed" && e.entityId === "plate")).toBe(true);
  });

  it("no water, no progress; clean dishes are ignored", () => {
    const dry = washingSystem.step(stateWith(0), 1000, []);
    expect(dry.entities.plate.components.washable!.elapsedSec ?? 0).toBe(0);
    const clean = washingSystem.step(stateWith(2, false), 1000, []);
    expect(clean.events.length).toBe(0);
  });
});
