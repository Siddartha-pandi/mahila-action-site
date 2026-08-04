import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
    optimizePackageImports: [
      "lucide-react",
      "@mui/material",
      "@mui/icons-material",
      "date-fns",
      "recharts",
      "@radix-ui/react-icons",
    ],
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:all*(svg|jpg|png|webp|avif|css|js)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
  webpack: (config, { dev }) => {
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;

