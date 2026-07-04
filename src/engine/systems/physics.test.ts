import { describe, it, expect } from "vitest";
import { resolvePhysics } from "./physics.js";
import type { Components } from "../types.js";

const e = (components: Components) => ({ components });
const ING = { ingredient: { type: "tomato", state: "whole" } } as Components; // pickable by default

describe("resolvePhysics", () => {
  it("auto: pickable → dynamic, fixed scenery → fixed", () => {
    expect(resolvePhysics(e(ING))).toBe("dynamic"); // ingredient → pickable → dynamic
    expect(resolvePhysics(e({ station: { stationType: "counter", accepts: [] } }))).toBe("fixed");
    expect(resolvePhysics(e({ pickable: false }))).toBe("fixed");
  });

  it("explicit physics wins over auto", () => {
    expect(resolvePhysics(e({ ...ING, physics: "fixed" }))).toBe("fixed"); // pickable item pinned
    expect(resolvePhysics(e({ station: { stationType: "x", accepts: [] }, physics: "dynamic" }))).toBe("dynamic");
    expect(resolvePhysics(e({ physics: "none" }))).toBe("none");
  });

  it("auto: a parent with attached children stays fixed (won't tumble away from its kids)", () => {
    expect(resolvePhysics(e(ING))).toBe("dynamic");        // pickable + no children → dynamic
    expect(resolvePhysics(e(ING), true)).toBe("fixed");    // …but with children → fixed
    // explicit physics still wins even with children
    expect(resolvePhysics(e({ ...ING, physics: "dynamic" }), true)).toBe("dynamic");
  });

  it("explicit auto behaves like the default", () => {
    expect(resolvePhysics(e({ ...ING, physics: "auto" }))).toBe("dynamic");
    expect(resolvePhysics(e({ physics: "auto", pickable: false }))).toBe("fixed");
  });

  it("auto: pure emitter nodes (vfx/light/fluid, no mesh) never collide", () => {
    const bare = { id: "", slug: "", thumbnailUrl: null, modelUrl: null };
    const E = (components: Components, modelUrl: string | null = null) =>
      ({ components, assetRef: { ...bare, modelUrl } });
    expect(resolvePhysics(E({ vfx: { kind: "water", on: true } }))).toBe("none");
    expect(resolvePhysics(E({ light: { color: "#fff", intensity: 8 } }))).toBe("none");
    expect(resolvePhysics(E({ fluidSource: { liquid: "water", on: false } }))).toBe("none");
    // …but a vfx ON a real model keeps its body (the mesh is scenery)
    expect(resolvePhysics(E({ vfx: { kind: "steam", on: true } }, "https://x/m.glb"))).toBe("fixed");
    // …and a vfx alongside a physical role (stove) stays fixed
    expect(resolvePhysics(E({ vfx: { kind: "sparkle", on: true }, station: { stationType: "mystery", accepts: [] } }))).toBe("fixed");
    // explicit physics still wins
    expect(resolvePhysics(E({ vfx: { kind: "water", on: true }, physics: "fixed" }))).toBe("fixed");
  });
});
