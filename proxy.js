import { withAuth } from 'next-auth/middleware'

// Next.js 16 uses "proxy" instead of "middleware" for request interception.
// withAuth redirects unauthenticated requests to /login.
const authProxy = withAuth({ pages: { signIn: '/login' } })

export function proxy(req, event) {
  return authProxy(req, event)
}

export const config = {
  // Protect everything except login, NextAuth routes, static assets, and uploaded files
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|fonts|uploads|favicon.ico).*)',
  ],
}
