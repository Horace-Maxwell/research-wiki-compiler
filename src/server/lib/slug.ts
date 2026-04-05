export function slugifyTitle(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

