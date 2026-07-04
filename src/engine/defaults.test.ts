import { describe, it, expect } from "vitest";
import { createDefaultGameDef } from "../engine/defaults.js";

describe("createDefaultGameDef", () => {
  it("has a stove station and a raw ingredient to experiment with", () => {
    const def = createDefaultGameDef();
    const stove = def.entities.find((e) => e.components.station?.stationType === "stove");
    const ingredient = def.entities.find((e) => e.components.ingredient);
    expect(stove).toBeDefined();
    expect(stove?.components.transform?.position).toBeDefined();
    expect(ingredient?.components.ingredient?.state).toBe("whole");
    expect(def.sim.tickMs).toBeGreaterThan(0);
  });

  it("ships a recipe book whose inputs are ingredient requirements", () => {
    const def = createDefaultGameDef();
    expect(def.recipes.length).toBeGreaterThan(0);
    expect(def.recipes[0].inputs.every((i) => typeof i.type === "string")).toBe(true);
  });
});
