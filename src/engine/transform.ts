/**
 * Transform algebra — now provided by the standalone prefab-kit framework
 * (`src/lib/prefab-kit`), which owns the pure quaternion similarity math for
 * the Actor/Component attachment hierarchy. This module re-exports it so every
 * engine/runtime/editor consumer keeps its import path; kitchen types are
 * structurally identical to the kit's (see prefab-kit/types.ts).
 */
export * from "@pajama-studio/prefab-kit";
