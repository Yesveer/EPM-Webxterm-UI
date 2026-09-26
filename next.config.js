/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable standalone output for Docker production builds
  output: 'standalone',
  // Enable instrumentation.ts for server-side metrics initialisation
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
