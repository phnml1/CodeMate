import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GitHub from "next-auth/providers/github"
import { prisma } from "./prisma"

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  events: {
    async linkAccount({ user, account, profile }) {
      // GitHub OAuth 연결 시 githubId, email, githubToken 저장
      if (account.provider === 'github') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: Number(profile.id),
            githubToken: account.access_token,
            email: profile.email as string | undefined,
          },
        })
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { githubId: true },
        })

        if (dbUser) {
          session.user.githubId = dbUser.githubId
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'database',
  },
} satisfies NextAuthConfig

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)
