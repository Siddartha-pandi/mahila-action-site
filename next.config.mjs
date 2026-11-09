import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.125",
    "192.168.0.125:3000",
    "192.168.137.1",
    "192.168.1.6",
    "192.168.1.0/24",
    "192.168.137.0/24",
    "192.168.0.0/16",
    "10.0.0.0/8"
  ],
  reactStrictMode: false,
  serverExternalPackages: ["pg", "bcryptjs"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@mui/material",
      "@mui/icons-material",
      "date-fns",
      "recharts",
      "@radix-ui/react-icons",
    ],
  },
  turbopack: {},
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  headers: async () => {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    return [
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      {
        source: "/((?!api/).*)",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    return config;
  },
};

export default nextConfig;
