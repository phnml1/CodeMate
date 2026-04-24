import { useQuery } from "@tanstack/react-query";

import type { ConnectedRepositoryListResponse } from "@/types/repos";

async function fetchConnectedRepositories(): Promise<ConnectedRepositoryListResponse> {
  const res = await fetch("/api/repositories");

  if (!res.ok) {
    throw new Error("Failed to load connected repositories.");
  }

  return res.json();
}

export function useConnectedRepositories() {
  return useQuery({
    queryKey: ["connectedRepositories"],
    queryFn: fetchConnectedRepositories,
  });
}
