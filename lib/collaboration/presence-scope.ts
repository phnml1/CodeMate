export function getCollaborationPresenceScope() {
  const configured = process.env.COLLABORATION_PRESENCE_SCOPE
  if (configured !== undefined) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(configured)) {
      throw new Error("Invalid COLLABORATION_PRESENCE_SCOPE")
    }
    return configured
  }

  if (process.env.VERCEL_ENV === "preview") {
    throw new Error("Preview deployments require COLLABORATION_PRESENCE_SCOPE")
  }
  const appUrl = process.env.NEXTJS_URL ?? process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (appUrl) {
    const hostname = new URL(appUrl).hostname
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) ? "local" : "production"
  }
  return process.env.NODE_ENV === "production" ? "production" : "local"
}
