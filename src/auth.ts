import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import type { User } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    departmentId: string | null
    totalXp?: number
  }
}

const config = NextAuth({
  // Trust the deployment host (Vercel, localhost, custom ports). Without this
  // Auth.js v5 throws UntrustedHost in production/self-hosted mode and every
  // auth() call fails, so the whole app cannot authenticate.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) {
          return null
        }

        try {
          // Import dynamically to avoid schema errors during build
          const { db } = await import('@/db')
          const { users } = await import('@/db/schema')
          const { eq } = await import('drizzle-orm')

          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1)

          if (!user.length || !user[0].passwordHash) {
            return null
          }

          const isPasswordValid = await compare(
            credentials.password as string,
            user[0].passwordHash,
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user[0].id,
            email: user[0].email || '',
            name: user[0].name || '',
            role: user[0].role || 'EMPLOYEE',
            departmentId: user[0].departmentId,
            totalXp: user[0].totalXp ?? 0,
          } as User
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.departmentId = (user as any).departmentId
        token.name = user.name
        token.totalXp = (user as any).totalXp ?? 0
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).departmentId = token.departmentId
        ;(session.user as any).totalXp = (token as any).totalXp ?? 0
      }
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
})

export const { auth, handlers, signIn, signOut } = config
