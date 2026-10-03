import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";
import { isPrivateIp, parsePublicUrl, UnsafeUrlError } from "./ssrf";

export const MAX_BODY_BYTES = 1_500_000;
export const MAX_REDIRECTS = 5;
export const TOTAL_TIMEOUT_MS = 10_000;
const USER_AGENT = "ClientWebsiteAuditDesk/0.1 (+public-homepage-check; operator-initiated)";

export type FetchErrorCode =
  | "blocked"
  | "timeout"
  | "http_error"
  | "not_html"
  | "too_many_redirects"
  | "network";

export class FetchError extends Error {
  constructor(
    public code: FetchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export interface FetchedPage {
  finalUrl: string;
  status: number;
  html: string;
  truncated: boolean;
}

/** Overrides exist for tests only; defaults are the strict production guards. */
export interface FetchOptions {
  validateUrl?: (raw: string) => URL;
  isAddressAllowed?: (ip: string) => boolean;
  timeoutMs?: number;
  maxBytes?: number;
}

export async function fetchPublicWebsite(rawUrl: string, opts: FetchOptions = {}): Promise<FetchedPage> {
  const validate = opts.validateUrl ?? parsePublicUrl;
  const allowed = opts.isAddressAllowed ?? ((ip: string) => !isPrivateIp(ip));
  const deadline = Date.now() + (opts.timeoutMs ?? TOTAL_TIMEOUT_MS);
  const maxBytes = opts.maxBytes ?? MAX_BODY_BYTES;

  let current: URL;
  try {
    current = validate(rawUrl);
  } catch (e) {
    throw toFetchError(e);
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(current, allowed, deadline, maxBytes);
    if (res.status >= 300 && res.status < 400 && res.location) {
      try {
        // Every redirect target is re-validated (scheme, host, IP) before it is followed.
        current = validate(new URL(res.location, current).toString());
      } catch (e) {
        throw toFetchError(e);
      }
      continue;
    }
    if (res.status < 200 || res.status >= 300) {
      throw new FetchError("http_error", `Website responded with HTTP ${res.status}`);
    }
    if (!/text\/html|application\/xhtml\+xml/i.test(res.contentType)) {
      throw new FetchError("not_html", `Unsupported content type: ${res.contentType || "unknown"}`);
    }
    return { finalUrl: current.toString(), status: res.status, html: res.body, truncated: res.truncated };
  }
  throw new FetchError("too_many_redirects", `More than ${MAX_REDIRECTS} redirects`);
}

function toFetchError(e: unknown): FetchError {
  if (e instanceof FetchError) return e;
  if (e instanceof UnsafeUrlError) return new FetchError("blocked", e.message);
  return new FetchError("network", e instanceof Error ? e.message : "Network error");
}

interface RawResponse {
  status: number;
  location?: string;
  contentType: string;
  body: string;
  truncated: boolean;
}

function makeGuardedLookup(allowed: (ip: string) => boolean): net.LookupFunction {
  // Validation happens on the exact addresses the socket will connect to, which closes the DNS-rebinding gap.
  return (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, "", 4);
      const list = addresses as dns.LookupAddress[];
      const bad = list.find((a) => !allowed(a.address));
      if (bad || list.length === 0) {
        return callback(new UnsafeUrlError("Hostname resolves to a private or reserved address") as NodeJS.ErrnoException, "", 4);
      }
      if (options.all) {
        (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
      } else {
        callback(null, list[0].address, list[0].family);
      }
    });
  };
}

function requestOnce(
  url: URL,
  allowed: (ip: string) => boolean,
  deadline: number,
  maxBytes: number,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new FetchError("timeout", "Timed out"));

    const lib = url.protocol === "https:" ? https : http;
    const literal = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(literal) && !allowed(literal)) {
      return reject(new FetchError("blocked", "Private or reserved IP addresses are not allowed"));
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: makeGuardedLookup(allowed),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "pl,en;q=0.8,nl;q=0.7",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === "string" ? res.headers.location : undefined;
        const contentType = String(res.headers["content-type"] ?? "");
        if ((status >= 300 && status < 400) || status < 200 || status >= 300 || !/html/i.test(contentType)) {
          res.resume();
          return finish(() => resolve({ status, location, contentType, body: "", truncated: false }));
        }

        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        let stream: Readable = res;
        if (encoding === "gzip") stream = res.pipe(zlib.createGunzip());
        else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
        else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());

        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        stream.on("data", (chunk: Buffer) => {
          if (truncated) return;
          size += chunk.length;
          if (size > maxBytes) {
            truncated = true;
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            req.destroy(); // stop downloading; counts decompressed bytes, so bombs are capped too
            return finish(() => resolve({ status, contentType, body: decode(chunks, contentType), truncated: true }));
          }
          chunks.push(chunk);
        });
        stream.on("end", () => finish(() => resolve({ status, contentType, body: decode(chunks, contentType), truncated })));
        stream.on("error", (e) => finish(() => reject(new FetchError("network", e.message))));
      },
    );

    const timer = setTimeout(() => {
      req.destroy();
      finish(() => reject(new FetchError("timeout", "Timed out while fetching the website")));
    }, remaining);

    req.on("error", (e) =>
      finish(() => {
        if (e instanceof UnsafeUrlError) reject(new FetchError("blocked", e.message));
        else reject(new FetchError("network", e.message));
      }),
    );
    req.end();
  });
}

function decode(chunks: Buffer[], contentType: string): string {
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase() ?? "utf-8";
  const buf = Buffer.concat(chunks);
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}
