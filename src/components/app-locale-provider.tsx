"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  APP_LOCALE_COOKIE_NAME,
  APP_LOCALE_STORAGE_KEY,
  getLocaleCopy,
  localeToHtmlLang,
  resolveAppLocale,
  type AppLocale,
} from "@/lib/app-locale";

type AppLocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  copy: ReturnType<typeof getLocaleCopy>;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

function persistLocale(locale: AppLocale) {
  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  document.cookie = `${APP_LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
  document.documentElement.lang = localeToHtmlLang(locale);
}

export function AppLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const refreshRoute = router.refresh;
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    const storedRaw = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);

    if (storedRaw) {
      const storedLocale = resolveAppLocale(storedRaw);

      if (storedLocale !== initialLocale) {
        queueMicrotask(() => {
          setLocaleState(storedLocale);
          persistLocale(storedLocale);
          startTransition(() => {
            refreshRoute();
          });
        });
        return;
      }
    }

    persistLocale(initialLocale);
  }, [initialLocale, refreshRoute]);

  const value = useMemo<AppLocaleContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        if (nextLocale === locale) {
          return;
        }

        setLocaleState(nextLocale);
        persistLocale(nextLocale);
        startTransition(() => {
          refreshRoute();
        });
      },
      copy: getLocaleCopy(locale),
    }),
    [locale, refreshRoute],
  );

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale() {
  const context = useContext(AppLocaleContext);

  if (!context) {
    throw new Error("useAppLocale must be used inside AppLocaleProvider.");
  }

  return context;
}
