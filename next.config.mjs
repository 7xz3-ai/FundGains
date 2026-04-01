/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress BigInt serialization warnings from Prisma in dev
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
