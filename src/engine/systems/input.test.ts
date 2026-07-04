import { describe, it, expect } from "vitest";
import { createEngine, step } from "../../engine/engine.js";
import { createDefaultGameDef } from "../../engine/defaults.js";

describe("inputSystem", () => {
  it("toggleAppliance flips an entity's appliance on/off", () => {
    const def = createDefaultGameDef();
    const stove = def.entities.find((e) => e.id === "stove-1")!;
    stove.components.appliance = { on: false };
    let s = createEngine(def);
    s = step(s, 50, [{ type: "toggleAppliance", entityId: "stove-1" }]);
    expect(s.entities["stove-1"].components.appliance!.on).toBe(true);
    s = step(s, 50, [{ type: "toggleAppliance", entityId: "stove-1" }]);
    expect(s.entities["stove-1"].components.appliance!.on).toBe(false);
  });

  it("toggleAppliance on a knob also toggles the burner it controls", () => {
    const def = createDefaultGameDef();
    const asset = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };
    const tr = { position: { x: 0, y: 0, z: 0 }, rotationY: 0, scale: 1 };
    def.entities = [
      { id: "knob", name: "Knob", assetRef: asset, components: { transform: tr, appliance: { on: false, knob: { axis: "y", angle: 90, controls: "burner" } } } },
      { id: "burner", name: "Burner", assetRef: asset, components: { transform: tr, appliance: { on: false } } },
    ];
    let s = createEngine(def);
    s = step(s, 50, [{ type: "toggleAppliance", entityId: "knob" }]);
    expect(s.entities["knob"].components.appliance!.on).toBe(true);
    expect(s.entities["burner"].components.appliance!.on).toBe(true); // burner lit by the knob
    s = step(s, 50, [{ type: "toggleAppliance", entityId: "knob" }]);
    expect(s.entities["burner"].components.appliance!.on).toBe(false);
  });

  it("spawn dispenses a fresh whole ingredient in front of the box", () => {
    const def = createDefaultGameDef();
    def.entities = [
      { id: "box", name: "Box", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { transform: { position: { x: 1, y: 0, z: 2 }, rotationY: 0, scale: 1 }, station: { stationType: "mystery", accepts: [] } } },
    ];
    let s = createEngine(def);
    s = step(s, 50, [{ type: "spawn", entityId: "box", ingredientType: "tomato", newId: "new1" }]);
    const spawned = s.entities.new1;
    expect(spawned.components.ingredient).toEqual({ type: "tomato", state: "whole" });
    expect(spawned.components.transform!.position).toEqual({ x: 1, y: 0, z: 2.9 });
  });

  it("shatter removes the source and adds pickable ingredient pieces", () => {
    const def = createDefaultGameDef();
    def.entities = [
      { id: "fish", name: "Fish", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { transform: { position: { x: 0, y: 0, z: 0 }, rotationY: 0, scale: 1 }, ingredient: { type: "salmon", state: "whole" } } },
    ];
    let s = createEngine(def);
    s = step(s, 50, [{ type: "shatter", sourceId: "fish", pieces: [
      { id: "p1", type: "salmon", state: "cut", position: { x: 0, y: 0, z: 0.2 } },
      { id: "p2", type: "salmon", state: "cut", position: { x: 0, y: 0, z: -0.2 } },
    ] }]);
    expect(s.entities.fish).toBeUndefined(); // source removed
    expect(s.entities.p1.components.ingredient).toEqual({ type: "salmon", state: "cut" });
    expect(s.entities.p2.components.transform!.position.z).toBe(-0.2);
  });

  it("toggleCook still toggles a cookable's active flag", () => {
    const def = createDefaultGameDef();
    def.entities = [
      { id: "patty", name: "Patty", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { cookable: { state: "raw", cookSec: 4, burnSec: 8, elapsedSec: 0, active: false } } },
    ];
    let s = createEngine(def);
    s = step(s, 50, [{ type: "toggleCook", entityId: "patty" }]);
    expect(s.entities.patty.components.cookable!.active).toBe(true);
  });
});
