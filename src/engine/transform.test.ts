import { describe, it, expect } from "vitest";
import { composeTransform, worldToLocal, resolveWorldTransform, wouldCycle, IDENTITY } from "./transform.js";
import type { Components, Transform } from "./types.js";

const T = (x: number, y: number, z: number, rotationY = 0, scale = 1): Transform =>
  ({ position: { x, y, z }, rotationY, scale });
const near = (a: Transform, b: Transform) => {
  expect(a.position.x).toBeCloseTo(b.position.x, 6);
  expect(a.position.y).toBeCloseTo(b.position.y, 6);
  expect(a.position.z).toBeCloseTo(b.position.z, 6);
  expect(a.rotationY).toBeCloseTo(b.rotationY, 6);
  expect(a.scale).toBeCloseTo(b.scale, 6);
};
const ent = (components: Components) => ({ components });

describe("transform algebra", () => {
  it("identity parent: world == local", () => {
    near(composeTransform(IDENTITY, T(1, 2, 3, 0.5, 2)), T(1, 2, 3, 0.5, 2));
  });

  it("compose applies parent rotation, scale, translation", () => {
    // parent rotated 90° about Y, scale 2, at (10,0,0). local at (1,0,0).
    const w = composeTransform(T(10, 0, 0, Math.PI / 2, 2), T(1, 0, 0));
    // (1,0,0) rotated +90° → (0,0,-1) [x'=x cos+z sin, z'=-x sin+z cos], ×2 → (0,0,-2), +parent → (10,0,-2)
    near(w, T(10, 0, -2, Math.PI / 2, 1 * 2));
  });

  it("compose/worldToLocal round-trip with FULL XYZ rotation", () => {
    const parent: Transform = { position: { x: 1, y: 2, z: 3 }, rotationY: 0, rotation: { x: 0.3, y: 1.1, z: -0.5 }, scale: 1.5 };
    const child: Transform = { position: { x: -2, y: 4, z: 1 }, rotationY: 0, rotation: { x: -0.7, y: 0.2, z: 0.9 }, scale: 0.5 };
    const local = worldToLocal(parent, child);
    const back = composeTransform(parent, local);
    expect(back.position.x).toBeCloseTo(-2, 5);
    expect(back.position.y).toBeCloseTo(4, 5);
    expect(back.position.z).toBeCloseTo(1, 5);
    expect(back.rotation!.x).toBeCloseTo(-0.7, 5);
    expect(back.rotation!.y).toBeCloseTo(0.2, 5);
    expect(back.rotation!.z).toBeCloseTo(0.9, 5);
    expect(back.scale).toBeCloseTo(0.5, 5);
  });

  it("worldToLocal inverts compose (round-trip)", () => {
    const parent = T(5, 1, -3, 1.1, 1.7);
    const child = T(-2, 4, 6, 0.3, 0.5);
    const local = worldToLocal(parent, child);
    near(composeTransform(parent, local), child);
  });

  it("resolve: no attach → own transform (flat entities unaffected)", () => {
    const byId = { a: ent({ transform: T(3, 0, 4, 0.2, 1.5) }) };
    near(resolveWorldTransform("a", byId), T(3, 0, 4, 0.2, 1.5));
  });

  it("resolve: a two-level attach chain composes", () => {
    const root = ent({ transform: T(10, 0, 0, Math.PI / 2, 2) });
    const mid = ent({ transform: T(0, 0, 0), attach: { parentId: "root", offset: T(1, 0, 0) } });
    const byId = { root, mid };
    // same as the compose test above
    near(resolveWorldTransform("mid", byId), T(10, 0, -2, Math.PI / 2, 2));
  });

  it("resolve: missing parent falls back to own transform (no throw)", () => {
    const byId = { a: ent({ transform: T(1, 2, 3), attach: { parentId: "ghost", offset: T(9, 9, 9) } }) };
    near(resolveWorldTransform("a", byId), T(1, 2, 3));
  });

  it("resolve: a cycle does not loop forever", () => {
    const a = ent({ transform: T(1, 0, 0), attach: { parentId: "b", offset: T(0, 0, 0) } });
    const b = ent({ transform: T(0, 0, 0), attach: { parentId: "a", offset: T(0, 0, 0) } });
    const byId = { a, b };
    expect(() => resolveWorldTransform("a", byId)).not.toThrow();
  });

  it("wouldCycle catches self- and ancestor-parenting", () => {
    const byId = {
      a: ent({ transform: IDENTITY }),
      b: ent({ transform: IDENTITY, attach: { parentId: "a", offset: IDENTITY } }),
    };
    expect(wouldCycle("a", "a", byId)).toBe(true); // self
    expect(wouldCycle("a", "b", byId)).toBe(true); // a under b, but b is already under a
    expect(wouldCycle("c", "a", byId)).toBe(false); // fresh attach is fine
  });
});
