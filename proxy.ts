import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// 라우트
const ROUTES = {
  LOGIN: '/auth/login',
  DASHBOARD: '/dashboard',
} as const

// 공개 경로
const PUBLIC_PATHS = ['/auth', '/api-docs']
const PUBLIC_EXACT_PATHS = ['/']

/**
 * 주어진 경로가 보호되는 경로인지 확인
 */
function isProtectedPath(pathname: string): boolean {
  return (
    !PUBLIC_EXACT_PATHS.includes(pathname) &&
    !PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  )
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()
  const isLoggedIn = !!session
  const isProtected = isProtectedPath(pathname)

  // 미인증 사용자가 보호 페이지 접근 → 로그인으로 리다이렉트
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 인증된 사용자가 공개 페이지 접근 → 대시보드로 리다이렉트
  if (!isProtected && isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
