import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  // Ensure trailing slashes for proper routing on static hosts
  trailingSlash: true,
  basePath: '/otamat',
};

export default nextConfig;
