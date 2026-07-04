import { describe, it, expect } from "vitest";
import { createEngine, step } from "../../engine/engine";
import { createDefaultGameDef } from "../../engine/defaults";
import { POUR_RATE } from "./fluid";
import type { EntityDef, GameDef, Transform } from "../../engine/types";

const T = (x: number, y: number, z: number, scale = 1): Transform =>
  ({ position: { x, y, z }, rotationY: 0, scale });
const asset = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };
const E = (id: string, t: Transform, extra = {}): EntityDef =>
  ({ id, name: id, assetRef: asset, components: { transform: t, ...extra } });
const def = (entities: EntityDef[]): GameDef =>
  ({ ...createDefaultGameDef(), entities });

const kettle = (level: number, pouring = true) =>
  E("kettle", T(0, 1, 0), { fillable: { liquid: "water", level, capacity: 3, pouring } });
const cup = (level = 0, capacity = 2) =>
  E("cup", T(0.1, 0.2, 0), { fillable: { liquid: "water", level, capacity } });

describe("pouring (fillable → fillable)", () => {
  it("transfers level to the catcher below, conserving water", () => {
    let s = createEngine(def([kettle(2), cup()]));
    s = step(s, 1000, []);
    const k = s.entities.kettle.components.fillable!;
    const c = s.entities.cup.components.fillable!;
    expect(k.level).toBeCloseTo(2 - POUR_RATE, 5);
    expect(c.level).toBeCloseTo(POUR_RATE, 5);
    expect(k.level + c.level).toBeCloseTo(2, 5);
  });

  it("spills (drains, fills nothing) with no catcher below", () => {
    let s = createEngine(def([kettle(2)]));
    s = step(s, 500, []);
    expect(s.entities.kettle.components.fillable!.level).toBeCloseTo(2 - POUR_RATE / 2, 5);
  });

  it("tips back upright automatically when it runs dry", () => {
    let s = createEngine(def([kettle(0.001)]));
    s = step(s, 1000, []);
    s = step(s, 100, []);
    expect(s.entities.kettle.components.fillable!.pouring).toBe(false);
  });

  it("emits filled when the catcher tops out", () => {
    let s = createEngine(def([kettle(3), cup(1.9, 2)]));
    s = step(s, 1000, []);
    expect(s.events.some((e) => e.type === "filled" && e.entityId === "cup")).toBe(true);
    expect(s.entities.cup.components.fillable!.level).toBe(2);
  });
});
