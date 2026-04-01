/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress BigInt serialization warnings from Prisma in dev
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      'pino-pretty': false,
      'lokijs': false,
      'encoding': false,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;
