/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable turbopack due to monorepo detection issues
  experimental: {
    turbo: false,
    optimizePackageImports: ["@/components", "@/utils", "lucide-react"],
  },

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qfvgfrezpemporwxhmny.supabase.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.transformik.com",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache for 7 days
    qualities: [75, 80, 85, 90, 100], // Support quality values used in the app
  },

  // Enable compression
  compress: true,

  // Optimize production builds
  swcMinify: true,

  // Cache-Control headers for edge caching (reduces Supabase egress)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=43200, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Content-Signal",
            value: "",
          },
          {
            key: "Content-Security-Policy",
            value: "",
          },
        ],
      },
    ];
  },

  // Production optimizations
  poweredByHeader: false,
};

export default nextConfig;
