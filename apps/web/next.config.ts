import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Force Next to resolve workspace root at apps/web.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
