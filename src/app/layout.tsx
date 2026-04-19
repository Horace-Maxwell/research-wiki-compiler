import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";

import { AppLocaleProvider } from "@/components/app-locale-provider";
import { AppShell } from "@/components/app-shell";
import {
  APP_LOCALE_COOKIE_NAME,
  localeToHtmlLang,
  resolveAppLocale,
} from "@/lib/app-locale";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-ibm-plex-serif",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Research Wiki Compiler",
  description: "Local-first compiled research wiki workspace",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE_NAME)?.value);

  return (
    <html lang={localeToHtmlLang(locale)} suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${ibmPlexSerif.variable} antialiased`}
      >
        <AppLocaleProvider initialLocale={locale}>
          <AppShell>{children}</AppShell>
        </AppLocaleProvider>
      </body>
    </html>
  );
}
