import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },
  async rewrites() {
    return [
      {
        source: '/u/:username',
        destination: '/labs/profile/:username',
      },
    ];
  },
};

export default nextConfig;
