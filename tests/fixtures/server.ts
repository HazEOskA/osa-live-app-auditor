import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "app");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".js": "text/javascript",
};

export interface FixtureServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export function startFixtureServer(port = 0): Promise<FixtureServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      void (async () => {
        const requestPath = (req.url ?? "/").split("?")[0] ?? "/";
        const filePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
        const resolved = path.join(APP_DIR, filePath);

        if (!resolved.startsWith(APP_DIR)) {
          res.writeHead(400);
          res.end("Bad request");
          return;
        }

        try {
          const data = await readFile(resolved);
          const ext = path.extname(resolved);
          res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
          res.end(data);
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
        }
      })();
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      resolve({
        url: `http://127.0.0.1:${actualPort}`,
        port: actualPort,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}
