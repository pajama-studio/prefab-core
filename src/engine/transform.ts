/**
 * Transform algebra is provided by the standalone prefab-core framework,
 * which owns the pure quaternion similarity math for
 * the Actor/Component attachment hierarchy. This module re-exports it so every
 * engine/runtime/editor consumer keeps its import path; kitchen types are
 * structurally identical to the core schema types.
 */
export * from "../schema/index.js";
