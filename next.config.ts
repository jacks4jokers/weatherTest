import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/weatherTest",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
