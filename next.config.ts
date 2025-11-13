import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    // Increase body size limit for audio file uploads (200MB max as defined in constants)
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  images: {
    unoptimized: true, // Disable image optimization to avoid server-side fetching issues
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
