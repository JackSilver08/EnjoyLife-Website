import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      {
        protocol: "https",
        hostname: "lxqtkecmaspoikobgkjg.supabase.co",
        pathname: "/storage/v1/object/public/enjoylife-media/**",
      },
    ],
  },
};
export default nextConfig;
