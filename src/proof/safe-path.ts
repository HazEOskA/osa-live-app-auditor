import { realpathSync, existsSync } from "node:fs";
import path from "node:path";

export class UnsafePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafePathError";
  }
}

/**
 * Resolves `relativePath` against `root` and guarantees the result stays
 * inside `root` — rejects absolute paths, `..` traversal, and (when the
 * target exists) symlinks that resolve outside the root. Used by both the
 * bundle builder (writing evidence) and the independent validator (reading
 * it back), so neither can be tricked into touching files outside the run
 * directory.
 */
export function resolveWithinRoot(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new UnsafePathError(`Path "${relativePath}" must be relative, not absolute.`);
  }

  const normalizedRoot = path.resolve(root);
  const candidate = path.resolve(normalizedRoot, relativePath);
  const rootWithSep = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;

  if (candidate !== normalizedRoot && !candidate.startsWith(rootWithSep)) {
    throw new UnsafePathError(`Path "${relativePath}" escapes run directory via traversal.`);
  }

  if (existsSync(candidate)) {
    const realRoot = realpathSync(normalizedRoot);
    const realCandidate = realpathSync(candidate);
    const realRootWithSep = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
    if (realCandidate !== realRoot && !realCandidate.startsWith(realRootWithSep)) {
      throw new UnsafePathError(`Path "${relativePath}" resolves outside run directory via symlink.`);
    }
  }

  return candidate;
}

export function toPosixRelative(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}
