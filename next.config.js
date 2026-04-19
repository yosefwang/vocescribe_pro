/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['epub2', 'sharp'],
  },
};

module.exports = nextConfig;
