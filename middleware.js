import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  // Protect everything except login, NextAuth routes, static assets, and uploaded files
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|fonts|uploads|favicon.ico).*)',
  ],
}
