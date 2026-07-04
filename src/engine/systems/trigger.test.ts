import { describe, it, expect } from "vitest";
import { createEngine, step } from "../../engine/engine.js";
import type { GameDef } from "../../engine/types.js";

const ASSET = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };

/** A minimal def with a single cookable "patty-1" (self-contained — the trigger
 *  system reacts to its cookableState events). */
function pattyDef(): GameDef {
  return {
    id: "t", name: "t", version: 1, grid: { cols: 1, rows: 1, cellSize: 1 }, sim: { tickMs: 50 },
    entities: [{
      id: "patty-1", name: "Patty", assetRef: { ...ASSET },
      components: {
        cookable: { state: "raw", cookSec: 4, burnSec: 8, elapsedSec: 0, active: false },
        stateful: { current: "raw", states: [{ key: "raw", tint: "#e8a0a0" }, { key: "cooked", tint: "#8a5a2b" }, { key: "burnt", tint: "#2b2b2b" }] },
      },
    }],
    recipes: [], triggers: [],
  };
}

/** A def with the patty actively cooking and a trigger: when patty cooks → win. */
function cookingDef(extraTrigger = true): GameDef {
  const def = pattyDef();
  const patty = def.entities.find((e) => e.id === "patty-1")!;
  patty.components.cookable = { state: "raw", cookSec: 1, burnSec: 5, elapsedSec: 0, active: true };
  def.triggers = extraTrigger
    ? [{ id: "t1", when: { kind: "cookableState", entityId: "patty-1", state: "cooked" }, do: { kind: "win" } }]
    : [];
  return def;
}

describe("triggerSystem — gameplay verbs", () => {
  it("a 'start' trigger fires on the first tick and can kick off cooking", () => {
    const def = pattyDef();
    const patty = def.entities.find((e) => e.id === "patty-1")!;
    patty.components.cookable = { state: "raw", cookSec: 1, burnSec: 5, elapsedSec: 0, active: false };
    def.triggers = [{ id: "s", when: { kind: "start" }, do: { kind: "setCookableActive", entityId: "patty-1", active: true } }];
    let s = createEngine(def);
    s = step(s, 60, []); // one tick
    expect(s.entities["patty-1"].components.cookable!.active).toBe(true);
  });

  it("addScore accumulates; scoreAtLeast → win resolves in the same tick (chain)", () => {
    const def = pattyDef();
    const patty = def.entities.find((e) => e.id === "patty-1")!;
    patty.components.cookable = { state: "raw", cookSec: 1, burnSec: 9, elapsedSec: 0, active: true };
    def.triggers = [
      { id: "a", when: { kind: "cookableState", entityId: "patty-1", state: "cooked" }, do: { kind: "addScore", amount: 30 } },
      { id: "b", when: { kind: "scoreAtLeast", value: 25 }, do: { kind: "win" } },
    ];
    let s = createEngine(def);
    s = step(s, 1100, []); // patty cooks → +30 → score≥25 → win, all one tick chain
    expect(s.score).toBe(30);
    expect(s.events.some((e) => e.type === "win")).toBe(true);
  });

  it("burnt → lose", () => {
    const def = pattyDef();
    const patty = def.entities.find((e) => e.id === "patty-1")!;
    patty.components.cookable = { state: "raw", cookSec: 1, burnSec: 2, elapsedSec: 0, active: true };
    def.triggers = [{ id: "l", when: { kind: "cookableState", entityId: "patty-1", state: "burnt" }, do: { kind: "lose" } }];
    let s = createEngine(def);
    s = step(s, 2100, []);
    expect(s.events.some((e) => e.type === "lose")).toBe(true);
  });
});

describe("triggerSystem", () => {
  it("fires a win when the cookable reaches the watched state", () => {
    let s = createEngine(cookingDef());
    // Step ~1.1s so the patty crosses cookSec (1s) → 'cooked' → trigger wins.
    s = step(s, 1100, []);
    expect(s.events.some((e) => e.type === "win")).toBe(true);
  });

  it("does not fire win without a matching trigger", () => {
    let s = createEngine(cookingDef(false));
    s = step(s, 1100, []);
    expect(s.events.some((e) => e.type === "win")).toBe(false);
  });

  it("setCookableActive action starts another entity cooking", () => {
    const def = pattyDef();
    const patty = def.entities.find((e) => e.id === "patty-1")!;
    patty.components.cookable = { state: "raw", cookSec: 1, burnSec: 5, elapsedSec: 0, active: true };
    // A second cookable that starts inactive, switched on when patty cooks.
    def.entities.push({
      id: "patty-2",
      name: "Patty 2",
      assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null },
      components: { cookable: { state: "raw", cookSec: 1, burnSec: 5, elapsedSec: 0, active: false } },
    });
    def.triggers = [
      { id: "t1", when: { kind: "cookableState", entityId: "patty-1", state: "cooked" }, do: { kind: "setCookableActive", entityId: "patty-2", active: true } },
    ];
    let s = createEngine(def);
    s = step(s, 1100, []);
    expect(s.entities["patty-2"].components.cookable!.active).toBe(true);
  });
});
