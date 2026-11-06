const PUBLIC_PATHS = ["/auth", "/api-docs"]
const PUBLIC_EXACT_PATHS = ["/"]

export function isProtectedPath(pathname: string): boolean {
  return (
    !PUBLIC_EXACT_PATHS.includes(pathname) &&
    !PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  )
}
