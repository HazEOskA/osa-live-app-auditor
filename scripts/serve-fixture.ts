#!/usr/bin/env tsx
import { startFixtureServer } from "../tests/fixtures/server";

async function main() {
  const port = process.argv[2] ? Number(process.argv[2]) : 4310;
  const server = await startFixtureServer(port);
  console.log(`Fixture app running at ${server.url}`);
  console.log("Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("Failed to start fixture server:", err);
  process.exit(1);
});
