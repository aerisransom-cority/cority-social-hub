import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role

    // API routes: authentication already verified by authorized callback below
    if (path.startsWith('/api/')) return NextResponse.next()

    // Role-based page access
    if (role === 'admin') return NextResponse.next()

    if (role === 'contributor') {
      const allowed = ['/', '/content-studio', '/performance', '/utm-builder']
      if (!allowed.some((p) => path === p || path.startsWith(p + '/'))) {
        return NextResponse.redirect(new URL('/content-studio', req.url))
      }
    }

    if (role === 'reviewer') {
      if (path !== '/' && !path.startsWith('/content-studio')) {
        return NextResponse.redirect(new URL('/content-studio', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        if (!token) return false
        // Revoked users (removed from KV) are blocked at the middleware level
        if (token.revoked) return false
        return true
      },
    },
    pages: { signIn: '/login' },
  }
)

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|fonts|uploads|favicon.ico).*)',
  ],
}
