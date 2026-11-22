import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the live development cache separate from production builds. Running
  // `next build` while `next dev` is open otherwise makes server-action and
  // environment metadata appear stale in the browser.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
