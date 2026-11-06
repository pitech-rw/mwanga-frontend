import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      { source: "/dashboard", destination: "/account", permanent: true },
      { source: "/dashboard/:path*", destination: "/account/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
