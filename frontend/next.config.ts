import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "uploadthing.com" },
      { hostname: "utfs.io" },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "recharts", "lucide-react"],
  },
};
export default nextConfig;