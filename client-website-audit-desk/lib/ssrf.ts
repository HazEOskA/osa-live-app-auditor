import net from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/** True when the IP belongs to a loopback, private, link-local, CGNAT, multicast or reserved range. */
export function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) return isPrivateV4(ip);
  if (v === 6) return isPrivateV6(ip);
  return true; // not an IP literal: treat as unsafe
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) || // 192.0.0.0/24, 192.0.2.0/24
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved + broadcast
  );
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped / compatible forms, e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") || // unique local
    /^fe[89ab]/.test(lower) || // link-local
    lower.startsWith("ff") || // multicast
    lower.startsWith("64:ff9b:") || // NAT64
    lower.startsWith("2001:db8") // documentation
  );
}

/** Parses and validates a user-supplied URL (scheme, credentials, port, literal IP, obvious internal hostnames). */
export function parsePublicUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are allowed");
  }
  if (url.username || url.password) throw new UnsafeUrlError("URLs with credentials are not allowed");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new UnsafeUrlError("Only standard ports 80 and 443 are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) throw new UnsafeUrlError("Missing hostname");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new UnsafeUrlError("Private or reserved IP addresses are not allowed");
  } else if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".")
  ) {
    throw new UnsafeUrlError("Internal hostnames are not allowed");
  }
  return url;
}
