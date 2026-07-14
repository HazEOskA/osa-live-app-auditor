import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The audit runtime spawns Playwright/Chromium; keep it out of the client bundle
  // and let API routes require it directly under Node.js runtime.
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
