export interface ConnectedRepo {
  id: string
  name: string
  fullName: string
}

export async function fetchConnectedRepos(): Promise<ConnectedRepo[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  const res = await fetch(`${baseUrl}/api/repositories`)
  if (!res.ok) return []
  const data = await res.json()
  return data.repositories ?? []
}
