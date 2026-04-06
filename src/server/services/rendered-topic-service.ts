import fs from "node:fs/promises";
import path from "node:path";

import {
  topicBootstrapManifestSchema,
  type TopicBootstrapManifest,
} from "@/lib/contracts/topic-bootstrap";
import { REPO_ROOT, TOPICS_ROOT } from "@/server/lib/repo-paths";
import { syncWikiIndex } from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

function getRenderedTopicRoot(slug: string) {
  return path.join(REPO_ROOT, "tmp", "rendered-topics", slug);
}

function getSyncMarkerPath(slug: string) {
  return path.join(
    getRenderedTopicRoot(slug),
    ".research-wiki",
    "topic-sync.json",
  );
}

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readSyncMarker(slug: string) {
  try {
    const raw = await fs.readFile(getSyncMarkerPath(slug), "utf8");
    return JSON.parse(raw) as { generatedAt: string };
  } catch {
    return null;
  }
}

async function writeSyncMarker(slug: string, generatedAt: string) {
  const markerPath = getSyncMarkerPath(slug);

  await fs.mkdir(path.dirname(markerPath), { recursive: true });
  await fs.writeFile(
    markerPath,
    `${JSON.stringify({ generatedAt }, null, 2)}\n`,
    "utf8",
  );
}

async function getTopicManifest(slug: string) {
  const manifestPath = path.join(TOPICS_ROOT, slug, "manifest.json");
  const raw = await fs.readFile(manifestPath, "utf8");
  return topicBootstrapManifestSchema.parse(JSON.parse(raw)) as TopicBootstrapManifest;
}

async function copyTopicWorkspace(slug: string) {
  const topicRoot = path.join(TOPICS_ROOT, slug);
  const from = path.join(topicRoot, "workspace");
  const to = getRenderedTopicRoot(slug);

  await fs.rm(to, { recursive: true, force: true });
  await fs.mkdir(to, { recursive: true });
  await fs.cp(from, to, {
    recursive: true,
    force: true,
  });
}

async function rebuildRenderedTopicWorkspace(slug: string, manifest: TopicBootstrapManifest) {
  await copyTopicWorkspace(slug);

  await initializeWorkspace({
    workspaceRoot: getRenderedTopicRoot(slug),
    workspaceName: manifest.title,
    initializeGit: false,
  });
  await syncWikiIndex(getRenderedTopicRoot(slug));
  await writeSyncMarker(slug, manifest.generatedAt);
}

export async function ensureRenderedTopicWorkspace(slug: string) {
  const manifest = await getTopicManifest(slug);
  const marker = await readSyncMarker(slug);
  const workspaceRoot = getRenderedTopicRoot(slug);
  const hasDatabase = await fileExists(path.join(workspaceRoot, ".research-wiki", "app.db"));

  if (!hasDatabase || marker?.generatedAt !== manifest.generatedAt) {
    await rebuildRenderedTopicWorkspace(slug, manifest);
  }

  return workspaceRoot;
}
