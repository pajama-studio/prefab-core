import { describe, it, expect } from "vitest";
import { validateGameDef } from "../engine/validate.js";
import { createDefaultGameDef } from "../engine/defaults.js";

describe("validateGameDef", () => {
  it("accepts a default def", () => {
    const res = validateGameDef(createDefaultGameDef());
    expect(res.ok).toBe(true);
  });

  it("rejects a non-object", () => {
    const res = validateGameDef(null);
    expect(res.ok).toBe(false);
  });

  it("rejects duplicate entity ids", () => {
    const def = createDefaultGameDef();
    def.entities[1].id = def.entities[0].id;
    const res = validateGameDef(def);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join(" ")).toMatch(/duplicate/i);
  });

  it("rejects tickMs <= 0", () => {
    const def = createDefaultGameDef();
    def.sim.tickMs = 0;
    expect(validateGameDef(def).ok).toBe(false);
  });

  it("rejects a transform with non-positive scale", () => {
    const def = createDefaultGameDef();
    def.entities[0].components.transform!.scale = 0;
    expect(validateGameDef(def).ok).toBe(false);
  });

  it("accepts optional hidden/locked booleans", () => {
    const def = createDefaultGameDef();
    def.entities[0].hidden = true;
    def.entities[0].locked = false;
    expect(validateGameDef(def).ok).toBe(true);
  });
});
