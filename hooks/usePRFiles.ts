import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import type { PRFile } from "@/types/pulls";

const GITHUB_REAUTH_REQUIRED = "GITHUB_REAUTH_REQUIRED";
let githubReauthHandled = false;
export const prFilesQueryKey = (id: string) => ["pullRequestFiles", id] as const;
type PRFilesQueryKey = ReturnType<typeof prFilesQueryKey>;
type PRFilesQueryOptions = Omit<
  UseQueryOptions<PRFile[], Error, PRFile[], PRFilesQueryKey>,
  "queryKey" | "queryFn"
>;

class PRFilesError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "PRFilesError";
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
      if (error instanceof PRFilesError && error.code === GITHUB_REAUTH_REQUIRED) {
        return false;
      }

      return failureCount < 3;
    },
    ...options,
  });

  useEffect(() => {
    if (
      query.error instanceof PRFilesError &&
      query.error.code === GITHUB_REAUTH_REQUIRED &&
      !githubReauthHandled
    ) {
      githubReauthHandled = true;

      toast.error("GitHub 인증이 만료되었습니다.", {
        description: "현재 계정에서 로그아웃 후 다시 로그인합니다.",
        duration: 2000,
      });

      const timer = window.setTimeout(() => {
        signOut({ callbackUrl: "/auth/login" });
      }, 1200);

      return () => window.clearTimeout(timer);
    }
  }, [query.error]);

  return query;
}
