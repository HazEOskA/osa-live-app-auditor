/**
 * Deterministic JSON serialization: object keys are sorted recursively so the
 * same logical data always produces the same byte sequence, which is what
 * makes hashing it meaningful across independent runs of the verifier.
 */
export function stableStringify(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null || value === undefined) return "null";

  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new TypeError("Cannot stably serialize non-finite number");
    }
    return JSON.stringify(value);
  }
  if (t === "boolean" || t === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item)).join(",")}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${serialize(obj[key])}`);
    return `{${entries.join(",")}}`;
  }

  throw new TypeError(`Cannot stably serialize value of type ${t}`);
}
