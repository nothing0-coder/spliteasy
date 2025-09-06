import {withSentryConfig} from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Rewrite API routes to handle authentication properly
      {
        source: '/auth/:path*',
        destination: '/api/auth/:path*',
      },
      {
        source: '/api/auth/callback/:path*',
        destination: '/auth/callback?code=:path*',
      },
    ];
  },
  async redirects() {
    return [
      // Redirect OAuth success to dashboard with proper status
      {
        source: '/auth/success',
        destination: '/dashboard',
        statusCode: 302,
      },
      // Redirect OAuth failure to login with error
      {
        source: '/auth/error',
        destination: '/login?error=auth_failed',
        statusCode: 302,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options
  org: "mae-4v",
  project: "spliteasy",
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true
});
