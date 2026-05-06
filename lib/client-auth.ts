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
