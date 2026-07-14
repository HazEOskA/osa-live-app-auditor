import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stableStringify } from "./stable-json";

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha256OfObject(value: unknown): string {
  return sha256Hex(stableStringify(value));
}

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Combines an ordered list of hex hashes into a single deterministic digest.
 * Order matters: callers must sort inputs (e.g. by file path, by event seq)
 * before calling this so the same evidence always yields the same root hash.
 */
export function combineHashes(orderedHexHashes: string[]): string {
  const hash = createHash("sha256");
  for (const h of orderedHexHashes) {
    hash.update(h);
  }
  return hash.digest("hex");
}
