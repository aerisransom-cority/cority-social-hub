import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { kvGet } from '../../../lib/kv'
import { verifyPassword } from '../../../lib/users'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const inputEmail = (credentials?.email || '').trim().toLowerCase()
        const inputPassword = (credentials?.password || '').trim()
        const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
        const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()

        // 1. Hardcoded admin (env vars) — always checked first, works even if KV is down
        if (inputEmail === adminEmail && inputPassword === adminPassword) {
          return {
            id: 'admin',
            email: process.env.ADMIN_EMAIL,
            name: process.env.ADMIN_NAME || 'Admin',
            role: 'admin',
          }
        }

        // 2. KV user store — contributors and reviewers
        try {
          const users = await kvGet('users', null)
          if (Array.isArray(users)) {
            const user = users.find((u) => u.email === inputEmail)
            if (user && verifyPassword(inputPassword, user.passwordSalt, user.passwordHash)) {
              return { id: user.id, email: user.email, name: user.name, role: user.role }
            }
          }
        } catch (err) {
          console.error('[auth] KV user lookup failed:', err.message)
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Called at sign-in — embed role, name, id into the JWT
        token.role = user.role
        token.name = user.name
        token.id = user.id
        token.revoked = false
      } else if (token.role !== 'admin' && token.id) {
        // Called on session refresh — verify non-admin user still exists in KV
        // This is how we detect a removed user and invalidate their session
        try {
          const users = await kvGet('users', null)
          const exists = Array.isArray(users) && users.some((u) => u.id === token.id)
          if (!exists) {
            token.revoked = true
          }
        } catch {
          // KV unavailable — don't revoke, fail open (preserve access)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role
        session.user.name = token.name
        session.user.id = token.id
        session.user.revoked = token.revoked || false
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 5 * 60, // Re-run jwt callback every 5 min — catches revoked users quickly
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
