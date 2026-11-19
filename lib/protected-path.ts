const PUBLIC_PATHS = ["/auth", "/api-docs"]
const PUBLIC_EXACT_PATHS = ["/", "/privacy", "/terms"]

export function isProtectedPath(pathname: string): boolean {
  return (
    !PUBLIC_EXACT_PATHS.includes(pathname) &&
    !PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  )
}
