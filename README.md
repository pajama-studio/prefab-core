# @pajama-studio/prefab-core

The pure-TypeScript core of Pajama Studio's kitchen prefab framework:

- **Prefab schema** — entities as component recipes (`cookable`, `fillable`,
  `holder`, `fluidSource`, `sliceable`, …), triggers, params, actions.
- **Deterministic engine** — `createEngine(def)` + `step(state, dtMs, inputs)`;
  no DOM, no Three.js, runs in Node and the browser alike.
- **Kitchen verbs** — cook, cut, wash, mix, fill, POUR (conservation
  transfer), appliances, timers, win/lose.

The visual runtime and the prefab editor UI live in `@pajama-studio/prefab-studio`.
