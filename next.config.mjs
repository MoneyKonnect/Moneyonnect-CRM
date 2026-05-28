/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js these packages should only run on the server, not edge runtime
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
