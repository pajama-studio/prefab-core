# Agent Guide — @pajama-studio/prefab-core

> GENERATED from `src/catalog.ts` (typed exhaustively against the engine) — edit the catalog, not this file.

Prefabs are **component recipes**: an entity is a bag of components; systems give them behavior; `step(state, dtMs, inputs)` is deterministic and pure. Compose prefabs by picking blocks below.

## Components (building blocks)

| block | meaning | player verbs | invariants |
|---|---|---|---|
| `transform` | World pose: position, rotationY, uniform scale. Every visible entity has one. | — | — |
| `character` | Marks a playable cook character (kit id + role). | play-as | — |
| `station` | A work surface that accepts specific item types (stationType + accepts list). | place-on | — |
| `cookable` | Heat state machine: raw → cooked → burnt over cookSec/burnSec while active. | cook | state only advances while active; burnt is terminal |
| `washable` | Dirty/clean flag; washSec of washing (e.g. under a running tap) cleans it. | wash | — |
| `holder` | Carries up to `capacity` items; `inside` renders contents within the container; `dish` is a composed result. | put, take, mix | — |
| `timer` | Counts elapsedSec toward durationSec, then fires its onComplete trigger event once. | — | — |
| `stateful` | Generic named-state machine with per-state tint/badge — for bespoke prefab logic. | — | — |
| `appliance` | On/off machine (stove burner, mixer). Heat sources drive cookables above them. | toggle | — |
| `vfx` | A particle effect anchor (flames, steam, sparkle) toggled by gameplay. | — | — |
| `fluidSource` | Emits liquid while on (faucet). rate/jetSize/grain/cohesion/splash/jetSpeed/shadeMode tune sim + look. | turn-on, turn-off | fills the highest fillable in the column below (catchTarget) |
| `fillable` | Holds liquid up to capacity; level rises under a source. pouring:true drains it into the fillable below. | fill, pour | pour conserves volume source→target; pouring auto-stops at level 0; crossing capacity emits `filled` once |
| `light` | A point light (color + intensity) — fridge interiors, hood lamps. | — | — |
| `sliceable` | Cuttable along an axis at an offset; `cut` marks the separation done. | cut | — |
| `ingredient` | Food item with a prep state machine (whole → cut → diced; any stage → cooked → burnt). See game/ingredients catalog. | cut, cook | — |
| `pickable` | Player can pick this entity up (explicit boolean — roots must declare it). | pick-up, drop, throw | — |
| `physics` | Rapier body mode: auto | dynamic | fixed | none. | — | — |
| `snapToSurface` | Dropped items settle onto the surface below instead of floating. | — | — |
| `openable` | Door/lid hinge state (open/close), animated from the GLB's pivot. | open, close | — |
| `collider` | Physics shape override; `compound` uses hand-placed boxes in model-local space. | — | — |
| `prefabInstance` | This entity is a placed instance of a prefab template; edits to the template re-expand everywhere. | — | — |
| `sockets` | Named attachment points (position/rotationY/scale) other entities can attach into. | — | — |
| `attach` | Parents this entity into another's frame (parentId + offset, optional socket). | — | — |
| `primitive` | Procedural mesh (box/cylinder/sphere) with dims/color/opacity — ghosts use opacity 0. | — | — |
| `softBody` | XPBD particle rod skinned as a tube (the sausage): flops and drapes in play. | — | — |
| `tool` | Hand tool semantics (knife: hover an ingredient, click to cut). | cut | — |
| `slotMarker` | Editor-only marker for palette slot positions; never renders in play. | — | — |

## Trigger actions

| action | effect |
|---|---|
| `setApplianceOn` | Force an appliance on/off. |
| `toggleAppliance` | Flip an appliance's on state. |
| `setCookableActive` | Start/stop heat on a cookable. |
| `setFluidOn` | Open/close a fluid source (faucet). |
| `setPouring` | Tip a fillable container: it drains into whatever catches below (conservation; auto-stops empty). |
| `setOpenable` | Open/close a door or lid. |
| `setStateful` | Jump a stateful entity to a named state. |
| `mixHolder` | Mix a holder's raw contents into a composed dish (no heat). |
| `prefabAction` | Invoke a named action a prefab instance exposes. |
| `addScore` | Add to the score. |
| `win` | End the game as a win. |
| `lose` | End the game as a loss. |

## Composition rules

- Roots declare `pickable` explicitly; sub-parts `attach` into the root's tree.
- Invisible logic volumes are `primitive` ghosts (opacity 0) — colliders, spouts, fill volumes.
- Expose tunables as prefab `params` targeting `{ localId, component, field }`.
- Behavior changes REQUIRE engine tests (`vitest`) — the suite is the contract.
