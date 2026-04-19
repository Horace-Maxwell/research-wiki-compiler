import { cookies } from "next/headers";

import {
  APP_LOCALE_COOKIE_NAME,
  resolveAppLocale,
  type AppLocale,
} from "@/lib/app-locale";

export async function readRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  return resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE_NAME)?.value);
}
