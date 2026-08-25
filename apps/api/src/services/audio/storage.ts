import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getProjectRoot } from "@kairos/config";

/**
 * AudioStorage (build-plan §Wave1). Voice bytes are written through this
 * interface only, so swapping local disk for object storage in Wave 4 is a
 * single-implementation change — no call-site edits.
 */
export interface AudioStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/** Generates a collision-safe storage key namespaced per user. */
export function newAudioKey(userId: number): string {
  return `u${userId}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.webm`;
}

/**
 * Pilot implementation: local filesystem under `<repo>/.data/audio`.
 * Keys are treated as paths and sanitized — traversal attempts are rejected.
 * `.data/` is gitignored.
 */
export class LocalDiskAudioStorage implements AudioStorage {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(getProjectRoot(), ".data", "audio");
  }

  private resolve(key: string): string {
    const full = path.resolve(this.baseDir, key);
    const normalizedBase = path.resolve(this.baseDir);
    if (!full.startsWith(normalizedBase + path.sep)) {
      throw new Error(`Invalid audio key: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}

let defaultStorage: AudioStorage | null = null;

/** Lazily constructed process-wide storage; tests may inject their own. */
export function getAudioStorage(): AudioStorage {
  if (!defaultStorage) defaultStorage = new LocalDiskAudioStorage();
  return defaultStorage;
}

export function setAudioStorage(storage: AudioStorage | null): void {
  defaultStorage = storage;
}
