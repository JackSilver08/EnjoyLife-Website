import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      {
        protocol: "https",
        hostname: "lxqtkecmaspoikobkgjk.supabase.co",
        pathname: "/storage/v1/object/public/enjoylife-media/**",
      },
    ],
  },
};
export default nextConfig;
