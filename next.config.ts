import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is intentionally disabled: the starter pack's reference
  // /api/chat route exports `runtime = "nodejs"`, which Cache Components does
  // not support, and the dashboard is a single client-driven page where URL
  // search params are the state. A plain static shell + client components is
  // the simplest correct model here.
  cacheComponents: false,
  reactStrictMode: true,
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
