import { describe, it, expect } from "vitest";
import { createEngine, step } from "../../engine/engine";
import { createDefaultGameDef } from "../../engine/defaults";
import { catchTarget } from "./fluid";
import type { EntityDef, GameDef, Transform } from "../../engine/types";

const T = (x: number, y: number, z: number, scale = 1): Transform =>
  ({ position: { x, y, z }, rotationY: 0, scale });
const asset = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };
const E = (id: string, t: Transform, extra = {}): EntityDef =>
  ({ id, name: id, assetRef: asset, components: { transform: t, ...extra } });
const def = (entities: EntityDef[]): GameDef =>
  ({ ...createDefaultGameDef(), entities });

const tap = (on = true, rate = 1) => E("tap", T(0, 2, 0), { fluidSource: { liquid: "water", on, rate } });
const pot = (id: string, t: Transform, capacity = 2) => E(id, t, { fillable: { liquid: "water", level: 0, capacity } });

describe("fluid system (faucet → fillable)", () => {
  it("a running tap fills the container below at its rate", () => {
    let s = createEngine(def([tap(), pot("pot", T(0.1, 0.8, 0))]));
    s = step(s, 1000, []);
    expect(s.entities["pot"].components.fillable!.level).toBeCloseTo(1, 3);
  });

  it("stops at capacity and emits a one-shot `filled` event", () => {
    let s = createEngine(def([tap(true, 2), pot("pot", T(0, 0.8, 0), 1)]));
    const after = step(s, 1000, []); // 2 units/s × 1 s vs capacity 1 → clamps
    expect(after.entities["pot"].components.fillable!.level).toBe(1);
    expect(after.events.filter((e) => e.type === "filled").length).toBe(1);
    // Another second: already full → no growth, no repeat event.
    const later = step(after, 1000, []);
    expect(later.entities["pot"].components.fillable!.level).toBe(1);
    expect(later.events.filter((e) => e.type === "filled").length).toBe(0);
  });

  it("an off tap, an out-of-column pot, and a pot above the tap don't fill", () => {
    let s = createEngine(def([
      tap(false),
      pot("aside", T(3, 0.8, 0)),   // out of the stream column
      pot("above", T(0, 3, 0)),     // above the tap
    ]));
    s = step(s, 1000, []);
    expect(s.entities["aside"].components.fillable!.level).toBe(0);
    expect(s.entities["above"].components.fillable!.level).toBe(0);
  });

  it("the HIGHEST container below catches the stream (first surface wins)", () => {
    const src = E("tap", T(0, 2, 0), { fluidSource: { liquid: "water", on: true } });
    const high = pot("high", T(0, 1.2, 0));
    const low = pot("low", T(0, 0.3, 0));
    expect(catchTarget(
      { id: "tap", name: "tap", assetRef: asset, components: src.components },
      [high, low].map((e) => ({ id: e.id, name: e.name, assetRef: asset, components: e.components })),
    )?.id).toBe("high");
  });

  it("full chain: filling a pot fires a `filled` trigger (win)", () => {
    const d = {
      ...def([tap(true, 2), pot("pot", T(0, 0.8, 0), 1)]),
      triggers: [{ id: "t1", when: { kind: "filled", entityId: "pot" }, do: { kind: "win" } } as const],
    };
    let s = createEngine(d);
    s = step(s, 1000, []); // 2 units/s vs capacity 1 → filled this tick
    expect(s.events.some((e) => e.type === "win")).toBe(true);
  });

  it("toggleFluid input flips the tap on/off", () => {
    let s = createEngine(def([tap(false)]));
    s = step(s, 50, [{ type: "toggleFluid", entityId: "tap" }]);
    expect(s.entities["tap"].components.fluidSource!.on).toBe(true);
    s = step(s, 50, [{ type: "toggleFluid", entityId: "tap" }]);
    expect(s.entities["tap"].components.fluidSource!.on).toBe(false);
  });
});
