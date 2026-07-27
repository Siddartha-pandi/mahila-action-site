import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "pg", "bcryptjs"],
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    return config;
  },
};

export default nextConfig;
