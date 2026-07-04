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

## Stored-data compatibility policy

Prefabs in the wild are a CONTRACT:

1. Component fields are **additive-only** — never rename or remove a field
   without registering a migration.
2. The package format is version-gated and **migrated on read**
   (`PACKAGE_MIGRATIONS` in schema/serialize): bumping `PACKAGE_VERSION` to N
   requires a step lifting N-1 packages. Loading never rewrites storage;
   re-saving persists the current format naturally.
3. Domain packs own their data's evolution via `DomainPack.migrate`.
4. Hosts should keep **golden fixtures** — real stored prefabs captured from
   production — parsing and RUNNING in CI. If a fixture fails, fix the code
   or add a migration; never edit the fixture.
