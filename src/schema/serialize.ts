import type { CoreComponents, KitEntity, KitPrefab } from "./types.js";

/**
 * Serialization: prefabs are plain JSON already — this module adds the
 * VERSIONED PACKAGE envelope (so files survive format evolution), structural
 * validation (so a bad file fails loudly, not weirdly at runtime), and
 * dependency collection (a template that nests other prefabs exports as one
 * self-contained package).
 */

export const PACKAGE_FORMAT = "pajama-prefab-package";
export const PACKAGE_VERSION = 1;

/** Format-version upgrade chain, applied ON READ (never written back
 *  silently): when PACKAGE_VERSION bumps to N, register a step under N-1
 *  that lifts a version-(N-1) package to N. Colleagues' stored prefabs keep
 *  loading forever; re-saving naturally persists the current format. */
export const PACKAGE_MIGRATIONS: Record<number, (pkg: Record<string, unknown>) => Record<string, unknown>> = {
  // e.g. 1: (pkg) => ({ ...pkg, formatVersion: 2, prefabs: … })
};

// The package holds prefabs of ANY host domain — opaque component payloads.
type AnyPrefab = KitPrefab<CoreComponents<never>>;

export interface PrefabPackage {
  format: typeof PACKAGE_FORMAT;
  formatVersion: number;
  /** The prefab the package is "about" (first entry), then its dependencies. */
  prefabs: AnyPrefab[];
  /** Runtime packs required to interpret the package's declared components/actions. */
  requirements?: PrefabPackageRequirements;
  /** Derived manifest of external/library asset references used by the package. */
  assets?: PrefabPackageAsset[];
}

export interface PrefabPackageRequirements {
  packs?: PrefabPackagePackRequirement[];
}

export interface PrefabPackagePackRequirement {
  id: string;
  version?: string;
}

export type PrefabPackageAssetKind = "library" | "pajama" | "external";
export type PrefabPackageAssetField = "assetRef.modelUrl" | "assetRef.thumbnailUrl" | "primitive.mapUrl";

export interface PrefabPackageAsset {
  prefabId: string;
  entityId: string;
  field: PrefabPackageAssetField;
  url: string;
  kind: PrefabPackageAssetKind;
  assetId?: string;
  slug?: string;
}

function hasUnsafeUrlCharacters(url: string): boolean {
  return /[\u0000-\u001f\u007f\s]/.test(url);
}

export function classifyPrefabAssetUrl(url: string, asset?: { id?: string; slug?: string }): PrefabPackageAssetKind {
  if (asset?.id || asset?.slug) return "library";
  try {
    const u = new URL(url);
    return u.hostname === "assets.pajama.studio" ? "pajama" : "external";
  } catch {
    return "external";
  }
}

function addAssetRef(
  out: PrefabPackageAsset[],
  prefabId: string,
  entityId: string,
  field: PrefabPackageAssetField,
  value: unknown,
  asset?: { id?: string; slug?: string },
) {
  if (typeof value !== "string" || value.trim() === "") return;
  out.push({
    prefabId,
    entityId,
    field,
    url: value,
    kind: classifyPrefabAssetUrl(value, asset),
    ...(asset?.id ? { assetId: asset.id } : {}),
    ...(asset?.slug ? { slug: asset.slug } : {}),
  });
}

export function collectPrefabPackageAssets(pkg: Pick<PrefabPackage, "prefabs">): PrefabPackageAsset[] {
  const out: PrefabPackageAsset[] = [];
  for (const prefab of pkg.prefabs) {
    for (const entity of prefab.entities) {
      const assetRef = (entity as unknown as { assetRef?: { id?: string; slug?: string; modelUrl?: unknown; thumbnailUrl?: unknown } }).assetRef;
      const components = entity.components as Record<string, unknown>;
      const primitive = components.primitive as { mapUrl?: unknown } | undefined;
      addAssetRef(out, prefab.id, entity.id, "assetRef.modelUrl", assetRef?.modelUrl, assetRef);
      addAssetRef(out, prefab.id, entity.id, "assetRef.thumbnailUrl", assetRef?.thumbnailUrl, assetRef);
      addAssetRef(out, prefab.id, entity.id, "primitive.mapUrl", primitive?.mapUrl);
    }
  }
  return out;
}

export function withPrefabPackageAssetManifest(pkg: PrefabPackage): PrefabPackage {
  return { ...pkg, assets: collectPrefabPackageAssets(pkg) };
}

export function validatePrefabPackageAssetUrls(pkg: Pick<PrefabPackage, "prefabs">): string[] {
  const errs: string[] = [];
  for (const asset of collectPrefabPackageAssets(pkg)) {
    if (hasUnsafeUrlCharacters(asset.url)) {
      errs.push(`${asset.prefabId}/${asset.entityId} ${asset.field} has unsafe asset url characters`);
      continue;
    }
    try {
      const url = new URL(asset.url);
      if (url.protocol !== "https:") errs.push(`${asset.prefabId}/${asset.entityId} ${asset.field} must use https`);
    } catch {
      errs.push(`${asset.prefabId}/${asset.entityId} ${asset.field} is not a valid asset url`);
    }
  }
  return errs;
}

/** Structural errors that make a prefab unusable. Empty array = valid. */
export function validatePrefab(p: unknown): string[] {
  const errs: string[] = [];
  const pre = p as Partial<KitPrefab<CoreComponents<never>>> | null;
  if (!pre || typeof pre !== "object") return ["not an object"];
  if (typeof pre.id !== "string" || !pre.id) errs.push("missing id");
  if (typeof pre.name !== "string") errs.push("missing name");
  if (typeof pre.version !== "number") errs.push("missing version");
  if (!Array.isArray(pre.entities) || pre.entities.length === 0) { errs.push("no entities"); return errs; }
  const ids = new Set<string>();
  for (const e of pre.entities) {
    if (!e || typeof e.id !== "string" || !e.components || typeof e.components !== "object") { errs.push("malformed entity"); continue; }
    if (ids.has(e.id)) errs.push(`duplicate entity id "${e.id}"`);
    ids.add(e.id);
  }
  if (typeof pre.rootId !== "string" || !ids.has(pre.rootId)) errs.push("rootId does not name an entity");
  for (const e of pre.entities) {
    const parent = e?.components?.attach?.parentId;
    if (parent && !ids.has(parent)) errs.push(`"${e.id}" attaches to unknown "${parent}"`);
  }
  for (const prm of pre.params ?? []) {
    if (!ids.has(prm.target?.localId)) errs.push(`param "${prm.key}" targets unknown "${prm.target?.localId}"`);
  }
  for (const act of pre.actions ?? []) {
    for (const st of act.steps ?? []) {
      if (st.entityId && !ids.has(st.entityId)) errs.push(`action "${act.id}" step targets unknown "${st.entityId}"`);
    }
  }
  return errs;
}

/** Prefab ids a template depends on (nested instances), recursively. */
export function collectPrefabDeps<C extends CoreComponents<C>, E extends KitEntity<C>>(
  prefabId: string,
  prefabsById: Record<string, KitPrefab<C, E>>,
): string[] {
  const seen = new Set<string>();
  const queue = [prefabId];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const p = prefabsById[id];
    for (const e of p?.entities ?? []) {
      const dep = e.components.prefabInstance?.prefabId;
      if (dep && !seen.has(dep)) queue.push(dep);
    }
  }
  seen.delete(prefabId);
  return [...seen];
}

/** Pack a prefab (+ every nested dependency) into a self-contained package. */
export function packPrefab<C extends CoreComponents<C>, E extends KitEntity<C>>(
  prefabId: string,
  prefabsById: Record<string, KitPrefab<C, E>>,
): PrefabPackage | null {
  const root = prefabsById[prefabId];
  if (!root) return null;
  const deps = collectPrefabDeps(prefabId, prefabsById)
    .map((id) => prefabsById[id])
    .filter((p): p is KitPrefab<C, E> => !!p);
  return withPrefabPackageAssetManifest({
    format: PACKAGE_FORMAT,
    formatVersion: PACKAGE_VERSION,
    prefabs: [root, ...deps] as unknown as AnyPrefab[],
  });
}

/** Parse + validate a package (accepts a JSON string or a parsed object). */
export function parsePrefabPackage(input: unknown): { ok: true; prefabs: AnyPrefab[] } | { ok: false; error: string } {
  let data: unknown = input;
  if (typeof input === "string") {
    try { data = JSON.parse(input); } catch { return { ok: false, error: "not valid JSON" }; }
  }
  const pkg = data as Partial<PrefabPackage> | null;
  if (!pkg || pkg.format !== PACKAGE_FORMAT) return { ok: false, error: `not a ${PACKAGE_FORMAT} file` };
  if (typeof pkg.formatVersion !== "number" || pkg.formatVersion > PACKAGE_VERSION) {
    return { ok: false, error: `unsupported format version ${pkg.formatVersion} (this app reads ≤ ${PACKAGE_VERSION})` };
  }
  // migrate-on-read: lift older packages step by step to the current format
  let lifted = pkg as Record<string, unknown>;
  while ((lifted.formatVersion as number) < PACKAGE_VERSION) {
    const step = PACKAGE_MIGRATIONS[lifted.formatVersion as number];
    if (!step) {
      return { ok: false, error: `no migration from format version ${lifted.formatVersion}` };
    }
    lifted = step(lifted);
  }
  const migrated = lifted as typeof pkg;
  if (!Array.isArray(migrated.prefabs) || migrated.prefabs.length === 0) return { ok: false, error: "package has no prefabs" };
  for (const p of migrated.prefabs) {
    const errs = validatePrefab(p);
    if (errs.length) return { ok: false, error: `prefab "${(p as AnyPrefab)?.id ?? "?"}": ${errs.join("; ")}` };
  }
  return { ok: true, prefabs: migrated.prefabs as AnyPrefab[] };
}
