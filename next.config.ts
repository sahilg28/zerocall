import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@0glabs/0g-ts-sdk', 'ethers'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
};

export default nextConfig;
