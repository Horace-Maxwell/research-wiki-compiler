import crypto from "node:crypto";
import path from "node:path";

import { normalizeWorkspaceRoot } from "@/server/lib/path-safety";
import { OPENCLAW_RENDERED_WORKSPACE_ROOT, REPO_ROOT } from "@/server/lib/repo-paths";

function createWorkspaceId(rootPath: string) {
  return `ws_${crypto.createHash("sha1").update(rootPath).digest("hex").slice(0, 24)}`;
}

export function createWikiPageIdForWorkspacePath(workspaceRoot: string, relativePath: string) {
  const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
  const workspaceId = createWorkspaceId(normalizedWorkspaceRoot);

  return `page_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${relativePath}`)
    .digest("hex")
    .slice(0, 32)}`;
}

export function buildWorkspacePageHref(
  basePath: string,
  workspaceRoot: string,
  relativePath: string,
) {
  const pageId = createWikiPageIdForWorkspacePath(workspaceRoot, relativePath);

  return `${basePath}?pageId=${encodeURIComponent(pageId)}`;
}

export function getRenderedTopicWorkspaceRoot(slug: string) {
  if (slug === "openclaw") {
    return OPENCLAW_RENDERED_WORKSPACE_ROOT;
  }

  return path.join(REPO_ROOT, "tmp", "rendered-topics", slug);
}

export function buildTopicPageHref(slug: string, relativePath: string) {
  return buildWorkspacePageHref(`/topics/${slug}`, getRenderedTopicWorkspaceRoot(slug), relativePath);
}

export function buildOpenClawExamplePageHref(relativePath: string) {
  return buildWorkspacePageHref("/examples/openclaw", OPENCLAW_RENDERED_WORKSPACE_ROOT, relativePath);
}
