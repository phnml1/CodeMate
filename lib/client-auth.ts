"use client";

import { signOut } from "next-auth/react";
import { toast } from "sonner";

const AUTO_LOGOUT_DELAY_MS = 1800;
const AUTH_CALLBACK_URL = "/auth/login";

let logoutScheduled = false;

export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

export async function createClientApiError(
  response: Response,
  fallbackMessage: string
): Promise<ClientApiError> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return new ClientApiError(
    typeof body?.error === "string" ? body.error : fallbackMessage,
    response.status
  );
}

export function handleUnauthorizedAutoLogout(message?: string) {
  if (typeof window === "undefined" || logoutScheduled) return;

  logoutScheduled = true;

  toast.error(message ?? "인증이 만료되어 다시 로그인합니다.", {
    description: "잠시 후 로그인 화면으로 이동합니다.",
    duration: AUTO_LOGOUT_DELAY_MS,
  });

  window.setTimeout(() => {
    void signOut({ callbackUrl: AUTH_CALLBACK_URL });
  }, AUTO_LOGOUT_DELAY_MS);
}

function isApplicationApiRequest(input: RequestInfo | URL): boolean {
  const requestUrl = new URL(
    input instanceof Request ? input.url : String(input),
    window.location.href
  );

  return (
    requestUrl.origin === window.location.origin &&
    requestUrl.pathname.startsWith("/api/") &&
    !requestUrl.pathname.startsWith("/api/auth/")
  );
}

export function installUnauthorizedFetchInterceptor(): () => void {
  const originalFetch = window.fetch;
  const fetchFromWindow = originalFetch.bind(window);

  const interceptedFetch: typeof fetch = async (input, init) => {
    const response = await fetchFromWindow(input, init);

    if (response.status === 401 && isApplicationApiRequest(input)) {
      handleUnauthorizedAutoLogout();
    }

    return response;
  };

  window.fetch = interceptedFetch;

  return () => {
    if (window.fetch === interceptedFetch) {
      window.fetch = originalFetch;
    }
  };
}
