import fs from "node:fs/promises";
import path from "node:path";

import {
  openClawExampleManifestSchema,
  type OpenClawExampleManifest,
} from "@/lib/contracts/openclaw-example";
import {
  OPENCLAW_EXAMPLE_MANIFEST_PATH,
  OPENCLAW_EXAMPLE_SNAPSHOT_ROOT,
  OPENCLAW_RENDERED_WORKSPACE_ROOT,
} from "@/server/lib/repo-paths";
import { listWikiPages, syncWikiIndex } from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

const EXAMPLE_SYNC_MARKER_PATH = path.join(
  OPENCLAW_RENDERED_WORKSPACE_ROOT,
  ".research-wiki",
  "openclaw-example-sync.json",
);

let openClawWorkspacePromise: Promise<string> | null = null;

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readSyncMarker() {
  try {
    const raw = await fs.readFile(EXAMPLE_SYNC_MARKER_PATH, "utf8");
    return JSON.parse(raw) as { generatedAt: string };
  } catch {
    return null;
  }
}

async function writeSyncMarker(generatedAt: string) {
  await fs.mkdir(path.dirname(EXAMPLE_SYNC_MARKER_PATH), { recursive: true });
  await fs.writeFile(
    EXAMPLE_SYNC_MARKER_PATH,
    `${JSON.stringify({ generatedAt }, null, 2)}\n`,
    "utf8",
  );
}

async function copySnapshotDirectory(name: "raw" | "reviews" | "audits" | "wiki") {
  const from = path.join(OPENCLAW_EXAMPLE_SNAPSHOT_ROOT, name);
  const to = path.join(OPENCLAW_RENDERED_WORKSPACE_ROOT, name);

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, {
    recursive: true,
    force: true,
  });
}

async function rebuildOpenClawRenderedWorkspace(manifest: OpenClawExampleManifest) {
  await fs.rm(OPENCLAW_RENDERED_WORKSPACE_ROOT, {
    recursive: true,
    force: true,
  });
  await fs.mkdir(OPENCLAW_RENDERED_WORKSPACE_ROOT, { recursive: true });

  for (const directoryName of ["raw", "reviews", "audits", "wiki"] as const) {
    await copySnapshotDirectory(directoryName);
  }

  await initializeWorkspace({
    workspaceRoot: OPENCLAW_RENDERED_WORKSPACE_ROOT,
    workspaceName: manifest.exampleName,
    initializeGit: false,
  });
  await syncWikiIndex(OPENCLAW_RENDERED_WORKSPACE_ROOT);
  await writeSyncMarker(manifest.generatedAt);
}

export async function getOpenClawExampleManifest() {
  const raw = await fs.readFile(OPENCLAW_EXAMPLE_MANIFEST_PATH, "utf8");
  return openClawExampleManifestSchema.parse(JSON.parse(raw));
}

export async function ensureOpenClawRenderedWorkspace() {
  if (!openClawWorkspacePromise) {
    openClawWorkspacePromise = (async () => {
      const manifest = await getOpenClawExampleManifest();
      const marker = await readSyncMarker();
      const hasDatabase = await fileExists(
        path.join(OPENCLAW_RENDERED_WORKSPACE_ROOT, ".research-wiki", "app.db"),
      );

      if (!hasDatabase || marker?.generatedAt !== manifest.generatedAt) {
        await rebuildOpenClawRenderedWorkspace(manifest);
      }

      return OPENCLAW_RENDERED_WORKSPACE_ROOT;
    })();
  }

  return openClawWorkspacePromise;
}

export async function getOpenClawRenderedExamplePageCount() {
  const workspaceRoot = await ensureOpenClawRenderedWorkspace();
  const pages = await listWikiPages(workspaceRoot);
  return pages.length;
}
