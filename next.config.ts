console.log("NEXT CONFIG LOADED");
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      // Unsplash
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },

      // Any HTTPS host
      {
        protocol: "https",
        hostname: "**",
      },

      // Django Localhost
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },

      // Localhost alias
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;