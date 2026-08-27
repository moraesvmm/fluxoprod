import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.png',
        permanent: true,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  serverExternalPackages: ['xml-crypto', '@xmldom/xmldom', '@xmldom/is-dom-node', 'node-forge'],
};

export default nextConfig;
