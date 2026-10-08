/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },

  // Standalone output bundles the server and its dependencies into
  // .next/standalone, which is what the Dockerfile copies and runs.
  //
  // It is switched OFF on Vercel. Vercel builds with its own output pipeline
  // and its post-build step reads .next/next-server.js.nft.json from the
  // normal layout; with standalone set, that step fails with ENOENT and the
  // deployment dies after a build that otherwise succeeded. Vercel's own
  // guidance is not to set this when deploying there.
  //
  // VERCEL is set to "1" on every Vercel build, so Docker and local builds are
  // unaffected and still get the standalone bundle.
  output: process.env.VERCEL ? undefined : 'standalone',

  // instrumentation.ts is loaded automatically from Next 15 onwards. The old
  // experimental.instrumentationHook flag is no longer a valid key and makes
  // the build print an "Invalid next.config.js options detected" warning.
};

module.exports = nextConfig;
