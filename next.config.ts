import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  register: true,
});

const nextConfig: NextConfig = {
  // Serwist injects webpack config; production builds use `next build --webpack`.
};

export default withSerwist(nextConfig);
