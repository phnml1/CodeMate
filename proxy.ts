import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const protectedPaths = ['/dashboard']

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()
  const isLoggedIn = !!session

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  // 미인증 사용자가 보호 페이지 접근 → 로그인으로 리다이렉트
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 인증된 사용자가 공개 페이지 접근 → 대시보드로 리다이렉트
  if (!isProtected && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
