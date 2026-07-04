import { describe, expect, it } from "vitest";
import { COMPONENT_CATALOG, ACTION_CATALOG } from "./catalog.js";

describe("agent catalog", () => {
  it("every component has a non-trivial doc", () => {
    for (const [k, v] of Object.entries(COMPONENT_CATALOG)) {
      expect(v.doc.length, k).toBeGreaterThan(15);
    }
  });
  it("every action has a non-trivial doc", () => {
    for (const [k, v] of Object.entries(ACTION_CATALOG)) {
      expect(v.length, k).toBeGreaterThan(10);
    }
  });
  it("verbs are lowercase-kebab tokens", () => {
    for (const v of Object.values(COMPONENT_CATALOG)) {
      for (const verb of v.verbs) expect(verb).toMatch(/^[a-z][a-z-]*$/);
    }
  });
});
