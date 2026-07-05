export interface AssetRef {
  id: string;
  slug: string;
  thumbnailUrl: string | null;
  modelUrl: string | null;
  /** When set, EntityModel renders only the named top-level child from the GLB.
   *  Used by the "Import Parts" flow to create one entity per Blender object. */
  subObject?: string;
  /** Node names to hide after loading (e.g. placeholder geometry that should
   *  be invisible at runtime but kept as positional anchors in the GLB). */
  hideNodes?: string[];
}

export interface Transform {
  position: { x: number; y: number; z: number };
  /** Legacy single-axis (Y) rotation in radians; kept in sync with rotation.y
   *  for back-compat. Prefer `rotation` (full Euler). */
  rotationY: number;
  /** Full Euler rotation in radians ({x,y,z}). When present it supersedes
   *  rotationY. Older saved data may only have rotationY. */
  rotation?: { x: number; y: number; z: number };
  scale: number;
}

/** One box of a compound collider, in UNSCALED model-local units. */
export interface ColliderBox {
  /** half-extents */
  half: { x: number; y: number; z: number };
  /** centre offset from the entity origin */
  center: { x: number; y: number; z: number };
}

export interface Components {
  transform?: Transform;
  character?: { kitId: string; role: "cook" };
  station?: { stationType: string; accepts: string[] };
  cookable?: { state: string; cookSec: number; burnSec: number; elapsedSec: number; active: boolean };
  /** Dish hygiene: dirty items render `dirtyModel` and become clean after
   *  `washSec` seconds spent inside a water-holding container (sink basin). */
  washable?: { dirty: boolean; washSec: number; elapsedSec?: number; dirtyModel?: string };
  /** `slots`: optional fixed local-space seat positions (e.g. egg-carton cells).
   *  When present, held items sit at slots[i] (scaled/rotated with the holder)
   *  instead of the default golden-ratio spread. */
  holder?: { capacity: number; held: string[]; dish?: string; inside?: boolean; initialHeld?: string[]; slots?: { x: number; y: number; z: number }[] };
  timer?: { durationSec: number; elapsedSec: number; onComplete: string };
  stateful?: { current: string; states: { key: string; tint: string; badge?: string }[] };
  /** A toggleable appliance (stove/oven/fryer). When `on`, it shows flames and
   *  can be flipped by clicking it in Play. `heatSec` accumulates while cooking.
   *  Optional `knob` makes the mesh rotate smoothly when toggled — a 90° Y-axis
   *  rotation is typical for a stove dial. */
  appliance?: {
    on: boolean;
    heatSec?: number;
    knob?: {
      /** Axis the knob rotates around in entity-local space. */
      axis: "x" | "y" | "z";
      /** Target angle in degrees when the appliance is ON. */
      angle: number;
      /** Optional: another entity whose appliance this knob also toggles (e.g. a
       *  front dial lighting a separate burner). In a prefab this is a prefab-local
       *  id, remapped per instance. */
      controls?: string;
    };
    /** Named placement slots on this appliance surface (e.g. 4 burner positions).
     *  XZ are in entity-local space at scale=1. When set, items released on this
     *  entity snap to the nearest slot instead of the centre. */
    slots?: { x: number; z: number }[];
  };
  /** A stylized particle emitter (flame/steam/smoke/sparkle/bubbles/water).
   *  Pure visual — for a real faucet that fills containers, use `fluidSource`. */
  vfx?: { kind: string; on: boolean };
  /** A liquid emitter (faucet/tap). While `on`, streams water downward: the
   *  runtime renders the stream ending on the first surface below (splash
   *  there), and systems/fluid fills any `fillable` container in the column.
   *  Click in Play to turn on/off. `rate` = level units per second (default 1). */
  fluidSource?: { liquid: "water" | "ketchup" | "mustard"; on: boolean; rate?: number   /** Visual width multiplier for the droplet jet (1 = default). */
    jetSize?: number;
    /** Pool droplet fineness (1 = default; smaller = finer grain). */
    grain?: number;
    /** Blobbiness 1-3: viscosity + visual overlap — how gel-like the water is. */
    cohesion?: number;
    /** Splashiness 0-2: how lively drops rebound off surfaces. */
    splash?: number;
    /** Jet exit speed multiplier (1 = default). */
    jetSpeed?: number;
    /** WebGPU water shading level 0-3 (0 flat → 3 full toon; debug bisect). */
    shadeMode?: number;
    /** Stream/droplet tint (CSS hex). Defaults to water blue; condiments set
     *  their sauce colour here (ketchup red, mustard yellow). */
    color?: string;
  };
  /** A container that catches liquid from a fluidSource above. `level` rises
   *  0→capacity while being filled; the runtime draws the liquid surface. */
  fillable?: { liquid?: "water"; level: number; capacity: number;
    /** Actively pouring: drains into the fillable below (kitchen verb #1). */
    pouring?: boolean   /** Optional interior heightfield over the ghost box footprint (row-major
     *  nz×nx, world y) — fluid collides with the REAL bowl surface. */
    heightfield?: { nx: number; nz: number; data: number[] };
    /** Solid occupancy voxels (base64 bitfield): solid cells are not enterable;
     *  open-container interiors remain empty so liquid can pool there. */
    voxels?: { nx: number; ny: number; nz: number; min: number[]; size: number[]; b64: string };
    /** Rounded-rect fluid collider tuning (world m / scales): offset, size, corner. */
    bowlOx?: number; bowlOz?: number; bowlSx?: number; bowlSz?: number; bowlR?: number;
  };
  /** A cozy point light attached to the entity. */
  light?: { color: string; intensity: number };
  /** A cuttable mesh: a knife slices it along the `axis` plane at `offset`
   *  (model-local). `cut` flips true at runtime when sliced. */
  sliceable?: { axis: "x" | "y" | "z"; offset: number; cut?: boolean };
  /** A Kitchen Lab ingredient: `type` (tomato/egg/…) drives a state machine,
   *  `state` (whole/cut/diced/cooked/burnt) selects the bound model. */
  ingredient?: { type: string; state: string };
  /** Explicitly mark whether the player can pick this up in first-person.
   *  When omitted, pickability is derived (a portable item with no station).
   *  `true` forces grabbable, `false` pins it as fixed scenery. */
  pickable?: boolean;
  /** When explicitly false, the play crosshair ignores this entity entirely —
   *  no hover outline, no name, and rays pass through to whatever is behind
   *  (e.g. an egg carton that should never steal focus from its eggs). */
  hoverable?: boolean;
  /** Physics body in play. `auto` (default) → dynamic if pickable, else fixed.
   *  `dynamic` simulates (gravity/collisions/tumble), `fixed` is immovable
   *  scenery (things rest on it), `none` is pure visual — no body or collider,
   *  the player passes through. Attached children always ride their parent. */
  physics?: "auto" | "dynamic" | "fixed" | "none";
  /** When true, releasing this item while aiming at a surface (station entity)
   *  snaps it to the top of that surface instead of dropping at heldPoint. */
  snapToSurface?: boolean;
  /** Clicking this entity toggles an open/close animation clip in its GLB.
   *  Completely separate from `appliance` (which is stove heat/fire). */
  openable?: { open: boolean };
  /** How this entity collides in play. `auto` (default) → trimesh for fixed
   *  containers/furniture (so things fall *into* open pots/sinks/fridges) and
   *  hull for pickable dynamic items (trimesh is unstable on dynamic bodies in
   *  Rapier). `compound` uses hand-placed box shapes for full control. */
  collider?: {
    kind: "auto" | "cuboid" | "hull" | "trimesh" | "compound";
    /** Compound-only: box shapes in UNSCALED model-local space (the entity's
     *  transform scale is applied on top at runtime). */
    shapes?: ColliderBox[];
  };
  /** Marks this entity as a LINKED prefab instance (Unreal-Blueprint style). Its
   *  sub-tree is derived from the prefab at load — editing the prefab updates
   *  every instance. `overrides` hold per-instance, per-sub-entity tweaks
   *  (keyed by the prefab-local entity id). See engine/prefab.ts. */
  prefabInstance?: {
    prefabId: string;
    /** Prefab version this instance was last reconciled against. */
    version: number;
    overrides?: Record<string, PrefabOverride>;
    /** Values for the prefab's exposed params (key → value); missing keys
     *  fall back to each param's default. */
    params?: Record<string, boolean | number>;
  };
  /** Manual attach sockets authored on this entity — named local anchor points
   *  (in addition to any read from its GLB). Children can snap to these. */
  sockets?: { name: string; position: { x: number; y: number; z: number }; rotationY: number; scale: number }[];
  /** Actor/Component attachment: this entity rides `parentId`, optionally at a
   *  named `socket` on the parent (Phase 2). `offset` is its transform in the
   *  parent's (socket) local frame; its world transform = parent ∘ offset. The
   *  entity's own `transform` is kept as a cached world value (used on detach).
   *  See engine/transform.ts. */
  attach?: { parentId: string; socket?: string; offset: Transform };
  /** Built-in geometric primitive (no GLB). Stores geometry and surface
   *  appearance so the shape can be resized, coloured, and textured without
   *  an external asset. */
  primitive?: {
    dims: { x: number; y: number; z: number };
    /** Geometry: box (default), cylinder (x = top Ø, z = bottom Ø, y = height)
     *  or sphere (x = Ø). Lets prefabs compose pots/plates/bins from editable
     *  primitives instead of baked meshes. */
    shape?: "box" | "cylinder" | "sphere";
    color?: string;     // hex "#rrggbb", default grey
    roughness?: number; // 0–1, default 0.8
    metalness?: number; // 0–1, default 0
    opacity?: number;   // 0–1, default 1 (< 1 → transparent)
    mapUrl?: string;    // diffuse texture image URL
  };
  /** A procedural soft body (no GLB): an XPBD particle-rod skinned as a tube —
   *  the "sausage". In Play the runtime drops it from the entity's transform
   *  and it flops/drapes over the kitchen (floor + solid entities); in Edit a
   *  static tube previews it. `stiffness` 0..1 is the flesh dial (0 = limp,
   *  1 = stays straight); `length`/`radius` are world units (× transform
   *  scale). Pair with `physics: "none"` — the soft-body layer owns its
   *  motion, Rapier must not also body it. Rendered by
   *  runtime/softbody/SoftBodyLayer; solver in runtime/softbody/rod.ts. */
  softBody?: { kind: "rod"; segments?: number; length?: number; radius?: number; stiffness?: number; color?: string };
  /** A hand tool the player can pick up and use. `kind` determines what
   *  clicking on targets does while the tool is held:
   *  - "knife": click an ingredient or cutting-board holder → advance cut state. */
  tool?: { kind: "knife" };
  /** Marks this entity as an edit-mode placement slot. Visible in edit as an
   *  orange diamond marker; invisible in play mode. Nearby entities snap to
   *  it when dropped within 0.35 m (XZ). Useful for pre-placing items on
   *  fridge shelves, display stands, etc. */
  slotMarker?: boolean;
}

export interface EntityDef {
  id: string;
  name: string;
  assetRef: AssetRef;
  components: Components;
  hidden?: boolean;
  locked?: boolean;
  /** Entities sharing a groupId select and move together as one unit. */
  groupId?: string;
}

/** One required ingredient in a recipe — a type, optionally in a specific prep
 *  state (e.g. diced). Omit `state` to accept any prep of that ingredient. */
export interface IngredientReq {
  type: string;
  state?: string;
}

/** A user-uploaded 3D model, scoped to a project. Stored in GameDef so it
 *  travels with the project on save/load. The file lives in R2 at
 *  `users/{ownerId}/models/{id}.glb`. */
export interface StudioModel {
  id: string;
  name: string;
  modelUrl: string;
  thumbnailUrl?: string;
  /** Components wired automatically when this model is dragged into the scene. */
  initialComponents?: Partial<Components>;
}

/** A dish discovered by combining ingredients in a pot. `hidden` dishes don't
 *  appear in the codex until found — the experiment payoff. */
export interface Recipe {
  id: string;
  name: string;
  inputs: IngredientReq[];
  output: string;
  hidden?: boolean;
}

/** Declarative logic: when an event happens, do an action. The reserved
 *  triggerSystem evaluates these against the events emitted each tick. */
export type TriggerWhen =
  | { kind: "start" }
  | { kind: "cookableState"; entityId: string; state: string }
  | { kind: "timerComplete"; entityId: string }
  | { kind: "filled"; entityId: string }
  | { kind: "scoreAtLeast"; value: number };
export type TriggerAction =
  | { kind: "setCookableActive"; entityId: string; active: boolean }
  | { kind: "setStateful"; entityId: string; key: string }
  /** Turn an appliance (stove/burner) on or off. */
  | { kind: "setApplianceOn"; entityId: string; on: boolean }
  /** Flip an appliance's on state (per-burner toggles). */
  | { kind: "toggleAppliance"; entityId: string }
  /** Turn a faucet (fluidSource) on or off. */
  | { kind: "setFluidOn"; entityId: string; on: boolean }
  /** Start/stop pouring a fillable container into whatever sits below. */
  | { kind: "setPouring"; entityId: string; pouring: boolean }
  /** Open or close a door/lid (openable component). */
  | { kind: "setOpenable"; entityId: string; open: boolean }
  /** Mix a holder's raw contents into a dish (no heat — salads, batters). */
  | { kind: "mixHolder"; entityId: string }
  /** Call a named action a prefab instance exposes (entityId = the instance). */
  | { kind: "prefabAction"; entityId: string; actionId: string }
  | { kind: "addScore"; amount: number }
  | { kind: "win" }
  | { kind: "lose" };
export interface Trigger {
  id: string;
  when: TriggerWhen;
  do: TriggerAction;
}

export interface GameDef {
  id: string;
  name: string;
  version: number;
  grid: { cols: number; rows: number; cellSize: number };
  sim: { tickMs: number };
  entities: EntityDef[];
  recipes: Recipe[];
  triggers?: Trigger[];
  /** User-uploaded GLB models scoped to this project. */
  customModels?: StudioModel[];
  /** Reusable Actor templates (Blueprints) scoped to this project; instances in
   *  `entities` (prefabInstance component) expand from these at load. */
  prefabs?: Prefab[];
}

/** A per-instance tweak to one sub-entity of a prefab (keyed by prefab-local id). */
export interface PrefabOverride {
  /** Component values merged over the prefab entity's (per-key replacement). */
  components?: Partial<Components>;
  /** This instance deleted the sub-entity. */
  removed?: boolean;
}

/**
 * A reusable Actor template (Unreal Blueprint): a self-contained sub-tree of
 * entities (root + attached children) plus shared logic, edited in its own
 * editor and instanced — linked — into games. `entities` use PREFAB-LOCAL ids;
 * `rootId` is the root entity (its transform is the instance's world placement).
 */
/** A developer-facing parameter a prefab exposes (a Blueprint "public
 *  variable"): its value writes into ONE field of ONE sub-entity's component
 *  at expansion. Instances store their values in `prefabInstance.params`. */
export interface PrefabParam {
  key: string;
  label?: string;
  kind: "boolean" | "number";
  /** Prefab-local binding, e.g. { localId: "spout", component: "fluidSource", field: "on" }. */
  target: { localId: string; component: keyof Components; field: string };
  default?: boolean | number;
}

/** A named, callable behaviour a prefab exposes (a Blueprint "custom event"):
 *  TriggerAction steps over prefab-local entity ids, remapped per instance.
 *  Call from game logic via the trigger action { kind: "prefabAction" } or the
 *  engine input { type: "callPrefabAction" }. */
export interface PrefabAction {
  id: string;
  label?: string;
  steps: TriggerAction[];
}

export interface Prefab {
  id: string;
  name: string;
  /** Bumped on every save so instances can detect/reconcile staleness. */
  version: number;
  rootId: string;
  entities: EntityDef[];
  /** Shared logic referencing prefab-local ids (remapped per instance). */
  triggers?: Trigger[];
  /** Exposed parameters (see PrefabParam). */
  params?: PrefabParam[];
  /** Exposed callable actions (see PrefabAction). */
  actions?: PrefabAction[];
}

export interface RuntimeEntity {
  id: string;
  name: string;
  assetRef: AssetRef;
  components: Components;
}

export interface EngineState {
  def: GameDef;
  timeMs: number;
  entities: Record<string, RuntimeEntity>;
  events: GameEvent[];
  score: number;
  /** The entity currently "in hand" (point-and-click carry), or null. */
  hand: string | null;
  /** Pocket inventory — three stow slots (entity ids); keys 1-3 swap with hand.
   *  Optional for older snapshots; treat missing as three empty slots. */
  pockets?: (string | null)[];
  /** Dishes discovered this session (codex). */
  discovered: string[];
}

export type Input =
  | { type: "toggleCook"; entityId: string }
  | { type: "toggleAppliance"; entityId: string }
  | { type: "interact"; entityId: string }
  /** Swap the hand with pocket slot N (stow if slot empty, unstow if hand empty). */
  | { type: "pocket"; slot: number }
  | { type: "slice"; entityId: string }
  | { type: "cut"; entityId: string }
  | { type: "spawn"; entityId: string; ingredientType: string; newId: string }
  /** Put the held item down at a world position (first-person "put down"). */
  | { type: "place"; position: { x: number; y: number; z: number } }
  /** Toggle the openable component's open state (fridge/cabinet door etc.). */
  | { type: "toggleOpen"; entityId: string }
  /** Turn a faucet/tap (fluidSource) on or off. */
  | { type: "toggleFluid"; entityId: string }
  /** Reposition an entity WITHOUT dropping it from the hand — keeps the engine
   *  transform tracking the aim point while a held squeeze bottle pours, so
   *  the fluid system fills the container actually under the stream. */
  | { type: "moveEntity"; entityId: string; position: { x: number; y: number; z: number } }
  /** Invoke a named PrefabAction on a placed instance (game-logic entry). */
  | { type: "callPrefabAction"; entityId: string; actionId: string }
  /** Replace a destroyed object with its pieces — each a pickable ingredient
   *  entity (the custom fragment mesh is held in a runtime side-channel). */
  | { type: "shatter"; sourceId: string; pieces: { id: string; type: string; state: string; position: { x: number; y: number; z: number } }[] };

export type GameEvent =
  | { type: "timerComplete"; entityId: string; onComplete: string }
  | { type: "cookableState"; entityId: string; state: string }
  | { type: "start" }
  | { type: "scoreChanged"; total: number }
  | { type: "delivered"; dish: string }
  | { type: "cut"; entityId: string }
  /** A fillable container just reached its capacity. */
  | { type: "filled"; entityId: string }
  /** A dirty dish finished its wash loop. */
  | { type: "washed"; entityId: string }
  /** A door/lid was opened or closed. */
  | { type: "doorToggled"; entityId: string; open: boolean }
  /** A tap was switched (squeak + splash on, squeak off). */
  | { type: "fluidToggled"; entityId: string; on: boolean }
  | { type: "dishMade"; dish: string }
  | { type: "discovered"; dish: string }
  | { type: "win" }
  | { type: "lose" };
