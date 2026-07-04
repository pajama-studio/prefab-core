import type { CoreComponents, KitPrefab } from "./types.js";
import {
  PACKAGE_FORMAT,
  PACKAGE_VERSION,
  parsePrefabPackage,
  validatePrefab,
  validatePrefabPackageAssetUrls,
  withPrefabPackageAssetManifest,
  type PrefabPackage,
} from "./serialize.js";

/**
 * Pluggable prefab persistence. The kit ships two reference backends
 * (in-memory, Web Storage); hosts add their own (D1, R2, filesystem…) by
 * implementing the four methods. Everything moves as plain JSON.
 */

export type AnyPrefab = KitPrefab<CoreComponents<never>>;

export type PrefabVisibility = "private" | "public";

export interface PrefabStoreSummary {
  id: string;
  name: string;
  version: number;
  updatedAt?: string;
  visibility?: PrefabVisibility;
}

export interface PrefabStoreSaveOptions {
  visibility?: PrefabVisibility;
}

export interface PrefabPackageStore {
  list(): Promise<PrefabStoreSummary[]>;
  loadPackage(id: string): Promise<PrefabPackage | null>;
  savePackage(pkg: PrefabPackage, opts?: PrefabStoreSaveOptions): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface PrefabStore extends PrefabPackageStore {
  load(id: string): Promise<AnyPrefab | null>;
  /** Rejects structurally invalid prefabs (see validatePrefab). */
  save(prefab: AnyPrefab, opts?: PrefabStoreSaveOptions): Promise<void>;
}

export function prefabToPackage(prefab: AnyPrefab): PrefabPackage {
  return withPrefabPackageAssetManifest({
    format: PACKAGE_FORMAT,
    formatVersion: PACKAGE_VERSION,
    prefabs: [prefab],
  });
}

export function normalizePrefabPackageForSave(pkg: PrefabPackage): PrefabPackage {
  const parsed = parsePrefabPackage(pkg);
  if (!parsed.ok) throw new Error(`invalid package: ${parsed.error}`);
  const assetErrs = validatePrefabPackageAssetUrls({ prefabs: parsed.prefabs });
  if (assetErrs.length) throw new Error(`invalid package asset url: ${assetErrs.join("; ")}`);
  return withPrefabPackageAssetManifest({
    format: PACKAGE_FORMAT,
    formatVersion: PACKAGE_VERSION,
    prefabs: parsed.prefabs,
    requirements: pkg.requirements,
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function summary(pkg: PrefabPackage, visibility?: PrefabVisibility): PrefabStoreSummary {
  const root = pkg.prefabs[0];
  return {
    id: root.id,
    name: root.name,
    version: root.version,
    ...(visibility ? { visibility } : {}),
  };
}

export class MemoryPrefabStore implements PrefabStore {
  private map = new Map<string, { pkg: PrefabPackage; visibility?: PrefabVisibility }>();
  async list() { return [...this.map.values()].map(({ pkg, visibility }) => summary(pkg, visibility)); }
  async loadPackage(id: string) { return this.map.has(id) ? clone(this.map.get(id)!.pkg) : null; }
  async load(id: string) { return (await this.loadPackage(id))?.prefabs[0] ?? null; }
  async savePackage(pkg: PrefabPackage, opts: PrefabStoreSaveOptions = {}) {
    const normalized = normalizePrefabPackageForSave(pkg);
    this.map.set(normalized.prefabs[0].id, { pkg: clone(normalized), visibility: opts.visibility });
  }
  async save(prefab: AnyPrefab, opts?: PrefabStoreSaveOptions) { await this.savePackage(prefabToPackage(prefab), opts); }
  async remove(id: string) { this.map.delete(id); }
}

/** localStorage/sessionStorage-backed store (one key per prefab + an index). */
export class WebStoragePrefabStore implements PrefabStore {
  /** Legacy default prefix; changing it would hide existing browser-saved prefabs. */
  constructor(private storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, private prefix = "prefab-kit:") {}
  private indexKey() { return `${this.prefix}index`; }
  private metaKey(id: string) { return `${this.prefix}meta:${id}`; }
  private readIndex(): string[] {
    try { return JSON.parse(this.storage.getItem(this.indexKey()) ?? "[]") as string[]; } catch { return []; }
  }
  private writeIndex(ids: string[]) { this.storage.setItem(this.indexKey(), JSON.stringify(ids)); }
  private readMeta(id: string): { visibility?: PrefabVisibility } {
    try { return JSON.parse(this.storage.getItem(this.metaKey(id)) ?? "{}") as { visibility?: PrefabVisibility }; } catch { return {}; }
  }
  async list() {
    const out: PrefabStoreSummary[] = [];
    for (const id of this.readIndex()) {
      const pkg = await this.loadPackage(id);
      if (pkg) out.push(summary(pkg, this.readMeta(id).visibility));
    }
    return out;
  }
  async loadPackage(id: string) {
    const raw = this.storage.getItem(this.prefix + id);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const pkg = parsePrefabPackage(parsed);
      if (pkg.ok) {
        return withPrefabPackageAssetManifest({
          format: PACKAGE_FORMAT,
          formatVersion: PACKAGE_VERSION,
          prefabs: pkg.prefabs,
          requirements: (parsed as PrefabPackage).requirements,
        });
      }
      const errs = validatePrefab(parsed);
      return errs.length ? null : prefabToPackage(parsed as AnyPrefab);
    } catch { return null; }
  }
  async load(id: string) { return (await this.loadPackage(id))?.prefabs[0] ?? null; }
  async savePackage(pkg: PrefabPackage, opts: PrefabStoreSaveOptions = {}) {
    const normalized = normalizePrefabPackageForSave(pkg);
    const id = normalized.prefabs[0].id;
    this.storage.setItem(this.prefix + id, JSON.stringify(normalized));
    this.storage.setItem(this.metaKey(id), JSON.stringify({ visibility: opts.visibility }));
    const idx = this.readIndex();
    if (!idx.includes(id)) this.writeIndex([...idx, id]);
  }
  async save(prefab: AnyPrefab, opts?: PrefabStoreSaveOptions) { await this.savePackage(prefabToPackage(prefab), opts); }
  async remove(id: string) {
    this.storage.removeItem(this.prefix + id);
    this.storage.removeItem(this.metaKey(id));
    this.writeIndex(this.readIndex().filter((x) => x !== id));
  }
}
