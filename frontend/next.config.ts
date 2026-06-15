import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "uploadthing.com" },
      { hostname: "utfs.io" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
        "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "date-fns",
      "class-variance-authority",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-label",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
    ],
  },
};
export default nextConfig;
