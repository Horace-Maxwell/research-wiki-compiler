// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AppLocaleProvider } from "@/components/app-locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  APP_LOCALE_COOKIE_NAME,
  APP_LOCALE_STORAGE_KEY,
} from "@/lib/app-locale";

const { pushMock, replaceMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

describe("language switcher", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
        key: (index: number) => [...storage.keys()][index] ?? null,
        get length() {
          return storage.size;
        },
      } satisfies Storage,
    });

    document.cookie = `${APP_LOCALE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    cleanup();
    refreshMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
    window.localStorage.clear();
    document.cookie = `${APP_LOCALE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  it("switches locale in-product and persists it for later reloads", async () => {
    render(
      <AppLocaleProvider initialLocale="en">
        <LanguageSwitcher />
      </AppLocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "中文" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "中文" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    expect(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe("zh");
    expect(document.cookie).toContain(`${APP_LOCALE_COOKIE_NAME}=zh`);
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("hydrates from stored locale when the client preference differs from the server render", async () => {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, "zh");

    render(
      <AppLocaleProvider initialLocale="en">
        <LanguageSwitcher />
      </AppLocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "中文" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    expect(document.cookie).toContain(`${APP_LOCALE_COOKIE_NAME}=zh`);
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server locale when storage is empty instead of reverting after mount", async () => {
    render(
      <AppLocaleProvider initialLocale="zh">
        <LanguageSwitcher />
      </AppLocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "中文" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    expect(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe("zh");
    expect(document.cookie).toContain(`${APP_LOCALE_COOKIE_NAME}=zh`);
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
