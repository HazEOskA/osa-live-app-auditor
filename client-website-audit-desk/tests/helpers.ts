import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createScoutContext } from "@/lib/createScoutContext";
import { cleanHtml } from "@/lib/cleanHtml";
import type { ReportLanguage, ScoutContext } from "@/lib/schemas";

export const fixture = (name: string): string =>
  fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");

export function scoutFrom(name: string, language: ReportLanguage = "pl"): ScoutContext {
  return createScoutContext({ url: `https://example.test/${name}`, signals: cleanHtml(fixture(name)), language, fetchMode: "fetched" });
}

export type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export async function withServer<T>(handler: Handler, fn: (base: string) => Promise<T>): Promise<T> {
  const server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
