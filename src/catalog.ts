import type { Components, TriggerAction } from "./engine/types.js";

/**
 * Agent Catalog — machine-readable semantics for every building block.
 *
 * Prefabs are component RECIPES; this catalog is how a coding agent (or a
 * UI) discovers what exists, what each block means, and which player verbs
 * it unlocks — without reading the engine source. The `satisfies` clauses
 * make the catalog EXHAUSTIVE BY CONSTRUCTION: adding a component or action
 * without documenting it here is a compile error, so the catalog can never
 * drift from the code.
 *
 * NOTE (0.2): kitchen-domain components still live in the central Components
 * type; the 0.3 milestone moves them behind prefab-kit's CoreComponents<C>
 * generic so domains own their component vocabularies end to end.
 */
export interface ComponentDoc {
  /** One-line semantic meaning, written for an agent composing prefabs. */
  doc: string;
  /** Player-facing verbs this block unlocks (empty = structural). */
  verbs: string[];
  /** Invariants an implementation must never break. */
  invariants?: string[];
}

export const COMPONENT_CATALOG = {
  transform: { doc: "World pose: position, rotationY, uniform scale. Every visible entity has one.", verbs: [] },
  character: { doc: "Marks a playable cook character (kit id + role).", verbs: ["play-as"] },
  station: { doc: "A work surface that accepts specific item types (stationType + accepts list).", verbs: ["place-on"] },
  cookable: { doc: "Heat state machine: raw → cooked → burnt over cookSec/burnSec while active.", verbs: ["cook"], invariants: ["state only advances while active", "burnt is terminal"] },
  washable: { doc: "Dirty/clean flag; washSec of washing (e.g. under a running tap) cleans it.", verbs: ["wash"] },
  holder: { doc: "Carries up to `capacity` items; `inside` renders contents within the container; `dish` is a composed result.", verbs: ["put", "take", "mix"] },
  timer: { doc: "Counts elapsedSec toward durationSec, then fires its onComplete trigger event once.", verbs: [] },
  stateful: { doc: "Generic named-state machine with per-state tint/badge — for bespoke prefab logic.", verbs: [] },
  appliance: { doc: "On/off machine (stove burner, mixer). Heat sources drive cookables above them.", verbs: ["toggle"] },
  vfx: { doc: "A particle effect anchor (flames, steam, sparkle) toggled by gameplay.", verbs: [] },
  fluidSource: { doc: "Emits liquid while on (faucet). rate/jetSize/grain/cohesion/splash/jetSpeed/shadeMode tune sim + look.", verbs: ["turn-on", "turn-off"], invariants: ["fills the highest fillable in the column below (catchTarget)"] },
  fillable: { doc: "Holds liquid up to capacity; level rises under a source. pouring:true drains it into the fillable below.", verbs: ["fill", "pour"], invariants: ["pour conserves volume source→target", "pouring auto-stops at level 0", "crossing capacity emits `filled` once"] },
  light: { doc: "A point light (color + intensity) — fridge interiors, hood lamps.", verbs: [] },
  sliceable: { doc: "Cuttable along an axis at an offset; `cut` marks the separation done.", verbs: ["cut"] },
  ingredient: { doc: "Food item with a prep state machine (whole → cut → diced; any stage → cooked → burnt). See game/ingredients catalog.", verbs: ["cut", "cook"] },
  pickable: { doc: "Player can pick this entity up (explicit boolean — roots must declare it).", verbs: ["pick-up", "drop", "throw"] },
  physics: { doc: "Rapier body mode: auto | dynamic | fixed | none.", verbs: [] },
  snapToSurface: { doc: "Dropped items settle onto the surface below instead of floating.", verbs: [] },
  openable: { doc: "Door/lid hinge state (open/close), animated from the GLB's pivot.", verbs: ["open", "close"] },
  collider: { doc: "Physics shape override; `compound` uses hand-placed boxes in model-local space.", verbs: [] },
  prefabInstance: { doc: "This entity is a placed instance of a prefab template; edits to the template re-expand everywhere.", verbs: [] },
  sockets: { doc: "Named attachment points (position/rotationY/scale) other entities can attach into.", verbs: [] },
  attach: { doc: "Parents this entity into another's frame (parentId + offset, optional socket).", verbs: [] },
  primitive: { doc: "Procedural mesh (box/cylinder/sphere) with dims/color/opacity — ghosts use opacity 0.", verbs: [] },
  softBody: { doc: "XPBD particle rod skinned as a tube (the sausage): flops and drapes in play.", verbs: [] },
  tool: { doc: "Hand tool semantics (knife: hover an ingredient, click to cut).", verbs: ["cut"] },
  slotMarker: { doc: "Editor-only marker for palette slot positions; never renders in play.", verbs: [] },
} as const satisfies Record<keyof Components, ComponentDoc>;

export const ACTION_CATALOG = {
  setApplianceOn: "Force an appliance on/off.",
  toggleAppliance: "Flip an appliance's on state.",
  setCookableActive: "Start/stop heat on a cookable.",
  setFluidOn: "Open/close a fluid source (faucet).",
  setPouring: "Tip a fillable container: it drains into whatever catches below (conservation; auto-stops empty).",
  setOpenable: "Open/close a door or lid.",
  setStateful: "Jump a stateful entity to a named state.",
  mixHolder: "Mix a holder's raw contents into a composed dish (no heat).",
  prefabAction: "Invoke a named action a prefab instance exposes.",
  addScore: "Add to the score.",
  win: "End the game as a win.",
  lose: "End the game as a loss.",
} as const satisfies Record<TriggerAction["kind"], string>;

/** Runtime accessor — lets tools and agents enumerate the block library. */
export function catalog() {
  return { components: COMPONENT_CATALOG, actions: ACTION_CATALOG };
}
