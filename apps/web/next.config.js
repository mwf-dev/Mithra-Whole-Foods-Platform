const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // ponytail: fixed HIGH-2 (removed ignoreBuildErrors/ignoreDuringBuilds)
  images: {
    // Serve modern formats (much smaller than JP/PNG) and cache optimized
    // variants at the edge for a day. `qualities` allow-lists the quality
    // values components pass (Thumbnail=50, product cards=60) — required to
    // avoid the Next 16 deprecation on arbitrary `quality`.
    formats: ["image/avif", "image/webp"],
    qualities: [50, 60, 75],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

/**
 * Sentry build integration.
 *
 * Source-map upload is gated on the org/project/token trio actually being
 * present. Without them the plugin still runs but uploads nothing, so a build
 * never fails because a secret is missing — which matters because CI and
 * preview deploys legitimately won't have `SENTRY_AUTH_TOKEN`.
 */
const { withSentryConfig } = require("@sentry/nextjs")

const hasSentryUploadCreds = Boolean(
  process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT &&
    process.env.SENTRY_AUTH_TOKEN
)

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Keep build logs readable; the plugin is chatty by default.
  silent: !process.env.CI,

  // Only do the expensive work when it can actually succeed.
  sourcemaps: { disable: !hasSentryUploadCreds },

  // Routes Sentry's browser requests through the app's own origin so ad
  // blockers don't silently drop error reports — the exact failure mode that
  // makes client-side error tracking untrustworthy. Requires the `monitoring`
  // exclusion in src/middleware.ts, or the region redirect eats it.
  tunnelRoute: "/monitoring",

  webpack: {
    // Strips Sentry's own debug logging from the client bundle.
    treeshake: { removeDebugLogging: true },
    // Vercel Cron / uptime monitors are not in use yet; skip the extra work.
    automaticVercelMonitors: false,
  },
})
