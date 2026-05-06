import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { handleUnauthorizedAutoLogout } from "@/lib/client-auth";
import type { PRFile } from "@/types/pulls";

const GITHUB_REAUTH_REQUIRED = "GITHUB_REAUTH_REQUIRED";

export const prFilesQueryKey = (id: string) => ["pullRequestFiles", id] as const;

type PRFilesQueryKey = ReturnType<typeof prFilesQueryKey>;
type PRFilesQueryOptions = Omit<
  UseQueryOptions<PRFile[], Error, PRFile[], PRFilesQueryKey>,
  "queryKey" | "queryFn"
>;

class PRFilesError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PRFilesError";
    this.status = status;
    this.code = code;
  }
}

async function fetchPRFiles(id: string): Promise<PRFile[]> {
  const res = await fetch(`/api/pulls/${id}/files`);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; code?: string }
      | null;

    throw new PRFilesError(
      body?.error ?? "PR 파일 목록을 불러오지 못했습니다.",
      res.status,
      body?.code
    );
  }

  const data = await res.json();
  return data.files;
}

export function usePRFiles(id: string, options?: PRFilesQueryOptions) {
  const query = useQuery({
    queryKey: prFilesQueryKey(id),
    queryFn: () => fetchPRFiles(id),
    retry: (failureCount, error) => {
      if (
        error instanceof PRFilesError &&
        (error.status === 401 || error.code === GITHUB_REAUTH_REQUIRED)
      ) {
        return false;
      }

      return failureCount < 3;
    },
    ...options,
  });

  useEffect(() => {
    if (!(query.error instanceof PRFilesError) || query.error.status !== 401) {
      return;
    }

    const message =
      query.error.code === GITHUB_REAUTH_REQUIRED
        ? "GitHub 인증이 만료되어 다시 로그인합니다."
        : "인증이 만료되어 다시 로그인합니다.";

    handleUnauthorizedAutoLogout(message);
  }, [query.error]);

  return query;
}
