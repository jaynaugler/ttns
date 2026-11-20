import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Set by the Next.js security upgrade (16.4.1 → 16.4.6); see
  // https://registry.npmjs.org/-/npm/v1/security/advisories/bulk
  experimental: {
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
