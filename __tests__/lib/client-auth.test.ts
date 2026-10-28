import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { installUnauthorizedFetchInterceptor } from "@/lib/client-auth";

jest.mock("next-auth/react", () => ({ signOut: jest.fn() }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

describe("unauthorized API responses", () => {
  it("shows one toast and signs out after the delay for application API 401s", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const setTimeoutMock = jest.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        fetch: fetchMock,
        location: {
          href: "https://codemate.test/pulls",
          origin: "https://codemate.test",
        },
        setTimeout: setTimeoutMock,
      },
    });

    try {
      const originalFetch = window.fetch;
      const uninstall = installUnauthorizedFetchInterceptor();

      await window.fetch("/api/pulls");
      await window.fetch("/api/auth/session");
      await window.fetch("https://github.test/resource");
      expect(toast.error).not.toHaveBeenCalled();

      const firstUnauthorized = await window.fetch(
        new Request("https://codemate.test/api/repositories/repo-1/sync")
      );
      await window.fetch("/api/repositories/repo-2/sync");

      expect(firstUnauthorized.status).toBe(401);
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(setTimeoutMock).toHaveBeenCalledTimes(1);
      expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 1800);

      const signOutAfterToast = setTimeoutMock.mock.calls[0][0] as () => void;
      signOutAfterToast();
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/auth/login" });

      uninstall();
      expect(window.fetch).toBe(originalFetch);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    }
  });
});
