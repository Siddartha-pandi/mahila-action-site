import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["lucide-react"],
  experimental: {
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
