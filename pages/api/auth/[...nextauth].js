import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Role definitions — expand when more users are added
const ROLES = {
  admin: {
    label: 'Admin',
    pages: ['*'], // full access
  },
  contributor: {
    label: 'Contributor',
    pages: ['request-brief', 'content-studio'],
  },
  reviewer: {
    label: 'Reviewer',
    pages: ['content-studio'], // read-only calendar + brief library
  },
}

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

        if (inputEmail === adminEmail && inputPassword === adminPassword) {
          return {
            id: '1',
            email: process.env.ADMIN_EMAIL,
            name: process.env.ADMIN_NAME || 'Admin',
            role: 'admin',
          }
        }
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role
        session.user.name = token.name
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
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
