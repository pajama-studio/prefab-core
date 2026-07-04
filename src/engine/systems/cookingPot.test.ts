import { describe, it, expect } from "vitest";
import { createEngine, step } from "../../engine/engine.js";
import { createDefaultGameDef } from "../../engine/defaults.js";
import type { GameDef } from "../../engine/types.js";

/** A pot holding a tomato + egg, on the heat, with a known recipe. */
function potDef(): GameDef {
  const def = createDefaultGameDef();
  def.entities = [
    { id: "tomato", name: "Tomato", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { ingredient: { type: "tomato", state: "diced" } } },
    { id: "egg", name: "Egg", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { ingredient: { type: "egg", state: "whole" } } },
    { id: "pot", name: "Pot", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { holder: { capacity: 4, held: ["tomato", "egg"] }, appliance: { on: true } } },
  ];
  def.recipes = [{ id: "r", name: "Shakshuka", inputs: [{ type: "tomato" }, { type: "egg" }], output: "Shakshuka" }];
  return def;
}

describe("cut input", () => {
  it("advances a cutting board's held ingredients one prep step", () => {
    const def = createDefaultGameDef();
    def.entities = [
      { id: "t", name: "Tomato", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { ingredient: { type: "tomato", state: "whole" } } },
      { id: "board", name: "Board", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { station: { stationType: "cutting", accepts: [] }, holder: { capacity: 1, held: ["t"] } } },
    ];
    let s = createEngine(def);
    s = step(s, 50, [{ type: "cut", entityId: "board" }]);
    expect(s.entities.t.components.ingredient!.state).toBe("cut");
    s = step(s, 50, [{ type: "cut", entityId: "board" }]);
    expect(s.entities.t.components.ingredient!.state).toBe("diced");
  });
});

describe("cookingPotSystem + discovery", () => {
  it("a heated pot cooks its ingredients and discovers the dish", () => {
    let s = createEngine(potDef());
    s = step(s, 5000, []); // > COOK_SEC
    expect(s.entities.tomato.components.ingredient!.state).toBe("cooked");
    expect(s.entities.pot.components.holder!.dish).toBe("Shakshuka");
    expect(s.discovered).toContain("Shakshuka");
    expect(s.events.some((e) => e.type === "discovered" && e.dish === "Shakshuka")).toBe(true);
  });

  it("an unknown combo still yields a Mystery discovery", () => {
    const def = potDef();
    def.recipes = []; // no recipe → mystery
    let s = createEngine(def);
    s = step(s, 5000, []);
    expect(s.entities.pot.components.holder!.dish).toMatch(/^Mystery:/);
    expect(s.discovered.length).toBe(1);
  });

  it("over-heating burns the ingredients", () => {
    let s = createEngine(potDef());
    s = step(s, 10000, []); // > BURN_SEC
    expect(s.entities.tomato.components.ingredient!.state).toBe("burnt");
  });

  it("a state-aware recipe matches the prep state; hidden dishes still discover", () => {
    const def = potDef(); // tomato is diced, egg whole
    def.recipes = [
      { id: "h", name: "Secret", inputs: [{ type: "tomato", state: "diced" }, { type: "egg" }], output: "Secret Dish", hidden: true },
    ];
    let s = createEngine(def);
    s = step(s, 5000, []);
    expect(s.entities.pot.components.holder!.dish).toBe("Secret Dish"); // matched on diced
    expect(s.discovered).toContain("Secret Dish");
  });

  it("a FULL fillable pot counts as one water ingredient → soup; water consumed", () => {
    const def = potDef();
    def.entities = [
      { id: "tomato", name: "Tomato", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: { ingredient: { type: "tomato", state: "diced" } } },
      { id: "pot", name: "Pot", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: {
        holder: { capacity: 4, held: ["tomato"] },
        appliance: { on: true },
        fillable: { liquid: "water", level: 3, capacity: 3 }, // full
      } },
    ];
    def.recipes = [{ id: "soup", name: "Soup", inputs: [{ type: "tomato", state: "diced" }, { type: "water" }], output: "Tomato Soup" }];
    let s = createEngine(def);
    s = step(s, 5000, []);
    expect(s.entities.pot.components.holder!.dish).toBe("Tomato Soup");
    expect(s.entities.pot.components.fillable!.level).toBe(0); // water consumed
  });

  it("a PARTIALLY filled pot does not count as water", () => {
    const def = potDef();
    def.entities[2].components.fillable = { liquid: "water", level: 1, capacity: 3 }; // not full
    def.recipes = [{ id: "soup", name: "Soup", inputs: [{ type: "tomato" }, { type: "egg" }, { type: "water" }], output: "Soup" }];
    let s = createEngine(def);
    s = step(s, 5000, []);
    expect(s.entities.pot.components.holder!.dish).toMatch(/^Mystery:/); // no water → recipe missed
    expect(s.entities.pot.components.fillable!.level).toBe(1); // untouched
  });

  it("a water-only pot boils into a discovery", () => {
    const def = potDef();
    def.entities = [
      { id: "pot", name: "Pot", assetRef: { id: "", slug: "", thumbnailUrl: null, modelUrl: null }, components: {
        holder: { capacity: 4, held: [] },
        appliance: { on: true },
        fillable: { liquid: "water", level: 2, capacity: 2 },
      } },
    ];
    def.recipes = [];
    let s = createEngine(def);
    s = step(s, 5000, []);
    expect(s.entities.pot.components.holder!.dish).toBe("Mystery: Water");
    expect(s.discovered).toContain("Mystery: Water");
  });

  it("a state-aware recipe does NOT match a different prep state", () => {
    const def = potDef();
    def.entities[0].components.ingredient = { type: "tomato", state: "whole" }; // not diced
    def.recipes = [{ id: "x", name: "Needs diced", inputs: [{ type: "tomato", state: "diced" }, { type: "egg" }], output: "X" }];
    let s = createEngine(def);
    s = step(s, 5000, []);
    expect(s.entities.pot.components.holder!.dish).toMatch(/^Mystery:/); // fell through to mystery
  });
});
