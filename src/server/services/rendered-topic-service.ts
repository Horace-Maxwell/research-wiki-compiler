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

function getTopicSourceWorkspaceRoot(slug: string) {
  return path.join(TOPICS_ROOT, slug, "workspace");
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
    return JSON.parse(raw) as {
      generatedAt: string;
      sourceUpdatedAt?: string;
    };
  } catch {
    return null;
  }
}

async function writeSyncMarker(
  slug: string,
  generatedAt: string,
  sourceUpdatedAt: string | null,
) {
  const markerPath = getSyncMarkerPath(slug);

  await fs.mkdir(path.dirname(markerPath), { recursive: true });
  await fs.writeFile(
    markerPath,
    `${JSON.stringify(
      {
        generatedAt,
        sourceUpdatedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function getLatestModifiedAt(root: string): Promise<string | null> {
  try {
    const rootStat = await fs.stat(root);
    let latestModifiedAt = rootStat.mtimeMs;
    const entries = await fs.readdir(root, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        const nestedModifiedAt = await getLatestModifiedAt(entryPath);

        if (nestedModifiedAt) {
          latestModifiedAt = Math.max(
            latestModifiedAt,
            new Date(nestedModifiedAt).getTime(),
          );
        }

        continue;
      }

      if (entry.isFile()) {
        const stat = await fs.stat(entryPath);
        latestModifiedAt = Math.max(latestModifiedAt, stat.mtimeMs);
      }
    }

    return new Date(latestModifiedAt).toISOString();
  } catch {
    return null;
  }
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
  const sourceUpdatedAt = await getLatestModifiedAt(getTopicSourceWorkspaceRoot(slug));

  await copyTopicWorkspace(slug);

  await initializeWorkspace({
    workspaceRoot: getRenderedTopicRoot(slug),
    workspaceName: manifest.title,
    initializeGit: false,
  });
  await syncWikiIndex(getRenderedTopicRoot(slug));
  await writeSyncMarker(slug, manifest.generatedAt, sourceUpdatedAt);
}

export async function ensureRenderedTopicWorkspace(slug: string) {
  const manifest = await getTopicManifest(slug);
  const marker = await readSyncMarker(slug);
  const workspaceRoot = getRenderedTopicRoot(slug);
  const hasDatabase = await fileExists(path.join(workspaceRoot, ".research-wiki", "app.db"));
  const sourceUpdatedAt = await getLatestModifiedAt(getTopicSourceWorkspaceRoot(slug));

  if (
    !hasDatabase ||
    marker?.generatedAt !== manifest.generatedAt ||
    marker?.sourceUpdatedAt !== sourceUpdatedAt
  ) {
    await rebuildRenderedTopicWorkspace(slug, manifest);
  }

  return workspaceRoot;
}
