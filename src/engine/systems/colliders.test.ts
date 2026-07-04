import { describe, it, expect } from "vitest";
import { resolveColliderKind } from "./colliders.js";
import type { Components } from "../types.js";

const e = (components: Components) => ({ components });
const ING = { ingredient: { type: "tomato", state: "whole" } } as Components; // pickable by default

describe("resolveColliderKind", () => {
  it("auto: a pickable item gets a hull (dynamic-safe)", () => {
    expect(resolveColliderKind(e(ING))).toBe("hull");
    expect(resolveColliderKind(e({ pickable: true }))).toBe("hull");
  });

  it("auto: fixed furniture/containers get a trimesh (things fall inside)", () => {
    expect(resolveColliderKind(e({ station: { stationType: "sink", accepts: [] } }))).toBe("trimesh");
    expect(resolveColliderKind(e({ pickable: false }))).toBe("trimesh");
  });

  it("explicit kind wins over auto", () => {
    expect(resolveColliderKind(e({ pickable: false, collider: { kind: "cuboid" } }))).toBe("cuboid");
    expect(resolveColliderKind(e({ pickable: false, collider: { kind: "compound" } }))).toBe("compound");
  });

  it("safety: trimesh requested on a pickable (dynamic) body downgrades to hull", () => {
    expect(resolveColliderKind(e({ ...ING, collider: { kind: "trimesh" } }))).toBe("hull");
    // but a fixed body keeps the explicit trimesh
    expect(resolveColliderKind(e({ pickable: false, collider: { kind: "trimesh" } }))).toBe("trimesh");
  });

  it("explicit auto behaves like the default", () => {
    expect(resolveColliderKind(e({ ...ING, collider: { kind: "auto" } }))).toBe("hull");
    expect(resolveColliderKind(e({ station: { stationType: "stove", accepts: [] }, collider: { kind: "auto" } }))).toBe("trimesh");
  });
});
