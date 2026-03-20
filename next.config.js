/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell Next.js not to bundle pdf-parse in the server bundle — require at runtime instead.
  // This prevents webpack/Turbopack from trying to inline pdf-parse's test-file references,
  // which do not exist in the serverless deployment environment.
  serverExternalPackages: ['pdf-parse'],
}

module.exports = nextConfig
