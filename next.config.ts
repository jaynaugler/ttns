import type { NextConfig } from "next";

// Security headers on every response. No Content-Security-Policy yet: Next
// injects inline scripts, so a CSP needs nonces and its own testing.
const securityHeaders = [
  // Don't let the browser guess a file's type (stops some XSS tricks).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't let other sites put the app in a frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin, not the full URL, to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these, so no page can ask for them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HTTPS only for a year once a browser has seen the site over HTTPS
  // (ignored on plain-HTTP localhost).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
