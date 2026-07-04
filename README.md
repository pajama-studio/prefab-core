# @pajama-studio/prefab-core

A **general-purpose** prefab game runtime in pure TypeScript:

- **Prefab schema** — entities as component recipes, linked templates with
  instances/overrides/params/actions (via `@pajama-studio/prefab-kit`).
- **Deterministic engine** — `createEngine(def)` + `step(state, dtMs, inputs,
  systems)`; no DOM, no Three.js; runs in Node and the browser alike.
- **Pluggable system packs** — the core ships domain-agnostic systems
  (timers, state machines, trigger→action dispatch, win/lose); domains plug
  their own packs in through the `systems` parameter and
  `registerActionHandler`.
- **Agent Catalog** — machine-readable block semantics (`catalog()`,
  generated `AGENTS.md`), exhaustive by construction.

Pajama Studio's kitchen gameplay (cooking, washing, pouring, real-fluid
sinks) is one such domain pack, built on this runtime.

The visual runtime and the prefab editor UI live in `@pajama-studio/prefab-studio`.
