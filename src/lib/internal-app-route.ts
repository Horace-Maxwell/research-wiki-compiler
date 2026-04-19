const INTERNAL_APP_HREF_PREFIXES = [
  "/dashboard",
  "/topics",
  "/questions",
  "/gaps",
  "/changes",
  "/acquisition",
  "/monitoring",
  "/sessions",
  "/syntheses",
  "/examples",
  "/settings",
  "/onboarding",
  "/wiki",
  "/sources",
  "/reviews",
  "/ask",
  "/audits",
] as const;

export function isInternalAppPath(pathname: string) {
  return INTERNAL_APP_HREF_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`) ||
      pathname.startsWith(`${prefix}?`),
  );
}

function normalizeExportedAppPath(pathname: string) {
  if (!pathname.endsWith(".html")) {
    return null;
  }

  const trimmed = pathname.replace(/\/+$/, "");
  const withoutIndex =
    trimmed === "/index.html" ? "/" : trimmed.replace(/\/index\.html$/, "").replace(/\.html$/, "");
  const normalized = withoutIndex.length > 0 ? withoutIndex : "/";

  return isInternalAppPath(normalized) ? normalized : null;
}

export function normalizeInternalAppRouteHref(href: string) {
  try {
    const url = new URL(href, "http://codex.local");

    if (url.origin !== "http://codex.local") {
      return href;
    }

    const normalizedExportedPath = normalizeExportedAppPath(url.pathname);

    if (normalizedExportedPath) {
      url.pathname = normalizedExportedPath;
    }

    if (url.pathname.endsWith(".md")) {
      return href;
    }

    if (!isInternalAppPath(url.pathname)) {
      return href;
    }

    url.searchParams.delete("workspaceRoot");
    url.searchParams.delete("pagePath");

    const search = url.searchParams.toString();

    return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  } catch {
    return href;
  }
}
