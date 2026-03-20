/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // unpdf dynamically imports pdfjs-dist at runtime — exclude from bundling
  // so Next.js doesn't try to inline its canvas/browser shims at build time.
  serverExternalPackages: ['unpdf', 'pdfjs-dist'],
}

module.exports = nextConfig
