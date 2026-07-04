/** Generates AGENTS.md from the typed Agent Catalog — run via `npm run gen`. */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COMPONENT_CATALOG, ACTION_CATALOG } from "../src/catalog";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lines: string[] = [
  "# Agent Guide — @pajama-studio/prefab-core",
  "",
  "> GENERATED from `src/catalog.ts` (typed exhaustively against the engine) — edit the catalog, not this file.",
  "",
  "Prefabs are **component recipes**: an entity is a bag of components; systems give them behavior; `step(state, dtMs, inputs)` is deterministic and pure. Compose prefabs by picking blocks below.",
  "",
  "## Components (building blocks)",
  "",
  "| block | meaning | player verbs | invariants |",
  "|---|---|---|---|",
];
for (const [key, d] of Object.entries(COMPONENT_CATALOG)) {
  const doc = d as { doc: string; verbs: readonly string[]; invariants?: readonly string[] };
  lines.push(`| \`${key}\` | ${doc.doc} | ${doc.verbs.join(", ") || "—"} | ${(doc.invariants ?? []).join("; ") || "—"} |`);
}
lines.push("", "## Trigger actions", "", "| action | effect |", "|---|---|");
for (const [key, doc] of Object.entries(ACTION_CATALOG)) lines.push(`| \`${key}\` | ${doc} |`);
lines.push(
  "",
  "## Composition rules",
  "",
  "- Roots declare `pickable` explicitly; sub-parts `attach` into the root's tree.",
  "- Invisible logic volumes are `primitive` ghosts (opacity 0) — colliders, spouts, fill volumes.",
  "- Expose tunables as prefab `params` targeting `{ localId, component, field }`.",
  "- Behavior changes REQUIRE engine tests (`vitest`) — the suite is the contract.",
  "",
);
writeFileSync(join(root, "AGENTS.md"), lines.join("\n"));
console.log("AGENTS.md generated");
