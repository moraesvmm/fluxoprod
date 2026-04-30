import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  serverExternalPackages: ['xml-crypto', '@xmldom/xmldom', '@xmldom/is-dom-node', 'node-forge'],
};

export default nextConfig;
