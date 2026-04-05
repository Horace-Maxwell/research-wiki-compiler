import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

import { eq } from "drizzle-orm";

import {
  type WorkspaceInitRequest,
  type WorkspaceRecord,
  type WorkspaceStatus,
  workspaceInitRequestSchema,
} from "@/lib/contracts/workspace";
import { WORKSPACE_BLUEPRINT } from "@/lib/constants";
import { getWorkspaceDatabase, inspectDatabase, runWorkspaceMigrations } from "@/server/db/client";
import { appSettings, workspaces } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import {
  normalizeWorkspaceRoot,
  resolveWithinWorkspaceRoot,
} from "@/server/lib/path-safety";
import { buildIndexPageTemplate } from "@/server/lib/workspace-templates";
import {
  ensureWorkspaceGitRepository,
  isGitRepository,
} from "@/server/services/git-service";
import { ensureWorkspacePromptTemplates } from "@/server/services/prompt-service";
import {
  buildWorkspaceSettings,
  readWorkspaceSettings,
  writeWorkspaceSettings,
} from "@/server/services/settings-service";

function createWorkspaceId(rootPath: string) {
  return `ws_${crypto.createHash("sha1").update(rootPath).digest("hex").slice(0, 24)}`;
}

function buildWorkspaceName(rawName: string | undefined, workspaceRoot: string) {
  return rawName?.trim() || path.basename(workspaceRoot);
}

async function ensureWorkspaceDirectories(workspaceRoot: string) {
  for (const blueprintEntry of WORKSPACE_BLUEPRINT) {
    if (blueprintEntry.kind === "directory") {
      await fs.mkdir(resolveWithinWorkspaceRoot(workspaceRoot, blueprintEntry.relativePath), {
        recursive: true,
      });
    }
  }
}

async function ensureWorkspaceSeedFiles(workspaceRoot: string, workspaceName: string) {
  const indexPath = resolveWithinWorkspaceRoot(workspaceRoot, "wiki", "index.md");

  try {
    await fs.access(indexPath);
  } catch {
    await fs.writeFile(
      indexPath,
      buildIndexPageTemplate(workspaceName, new Date().toISOString()),
      "utf8",
    );
  }
}

async function getWorkspaceRecord(workspaceRoot: string) {
  const dbPath = resolveWithinWorkspaceRoot(workspaceRoot, ".research-wiki", "app.db");
  const databaseState = inspectDatabase(dbPath);

  if (!databaseState.tables.includes("workspaces")) {
    return null;
  }

  const { db } = getWorkspaceDatabase(dbPath);
  const record = await db.query.workspaces.findFirst({
    where: eq(workspaces.rootPath, workspaceRoot),
  });

  if (!record) {
    return null;
  }

  const result: WorkspaceRecord = {
    id: record.id,
    name: record.name,
    status: record.status,
    rootPath: record.rootPath,
    gitEnabled: record.gitEnabled,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };

  return result;
}

export async function requireWorkspaceRecord(workspaceRoot: string) {
  const record = await getWorkspaceRecord(workspaceRoot);

  if (!record) {
    throw new AppError(
      "Workspace has not been initialized.",
      400,
      "workspace_not_initialized",
    );
  }

  return record;
}

export async function initializeWorkspace(input: WorkspaceInitRequest): Promise<WorkspaceStatus> {
  const parsedRequest = workspaceInitRequestSchema.safeParse(input);

  if (!parsedRequest.success) {
    throw new AppError(
      "Invalid workspace initialization request.",
      400,
      "invalid_workspace_request",
      parsedRequest.error.flatten(),
    );
  }

  const parsed = parsedRequest.data;
  const workspaceRoot = normalizeWorkspaceRoot(parsed.workspaceRoot);
  const workspaceName = buildWorkspaceName(parsed.workspaceName, workspaceRoot);
  const workspaceId = createWorkspaceId(workspaceRoot);
  const timestamp = new Date();

  await ensureWorkspaceDirectories(workspaceRoot);
  await ensureWorkspaceSeedFiles(workspaceRoot, workspaceName);
  await ensureWorkspacePromptTemplates(workspaceRoot);

  const existingSettings = await readWorkspaceSettings(workspaceRoot);
  const nextSettings = existingSettings
    ? {
        ...existingSettings,
        workspaceName,
        workspaceRoot,
        initializeGit: parsed.initializeGit,
        updatedAt: timestamp.toISOString(),
      }
    : buildWorkspaceSettings({
        workspaceName,
        workspaceRoot,
        initializeGit: parsed.initializeGit,
      });

  await writeWorkspaceSettings(workspaceRoot, nextSettings);

  const dbPath = resolveWithinWorkspaceRoot(workspaceRoot, ".research-wiki", "app.db");
  const db = runWorkspaceMigrations(dbPath);

  await db
    .insert(workspaces)
    .values({
      id: workspaceId,
      rootPath: workspaceRoot,
      name: workspaceName,
      status: "active",
      gitEnabled: parsed.initializeGit,
      createdAt: existingSettings ? new Date(existingSettings.createdAt) : timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: workspaces.rootPath,
      set: {
        name: workspaceName,
        status: "active",
        gitEnabled: parsed.initializeGit,
        updatedAt: timestamp,
      },
    });

  await db
    .insert(appSettings)
    .values({
      id: `setting_${workspaceId}`,
      workspaceId,
      key: "workspace_settings",
      valueJson: nextSettings,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [appSettings.workspaceId, appSettings.key],
      set: {
        valueJson: nextSettings,
        updatedAt: timestamp,
      },
    });

  if (parsed.initializeGit) {
    await ensureWorkspaceGitRepository(workspaceRoot);
  }

  logger.info(
    {
      workspaceRoot,
      workspaceId,
    },
    "Workspace initialized.",
  );

  return getWorkspaceStatus(workspaceRoot);
}

export async function getWorkspaceStatus(workspaceRootInput: string): Promise<WorkspaceStatus> {
  const workspaceRoot = normalizeWorkspaceRoot(workspaceRootInput);
  const requiredPaths = await Promise.all(
    WORKSPACE_BLUEPRINT.map(async (entry) => {
      const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, entry.relativePath);

      try {
        await fs.access(absolutePath);
        return {
          relativePath: entry.relativePath,
          absolutePath,
          kind: entry.kind,
          exists: true,
        };
      } catch {
        return {
          relativePath: entry.relativePath,
          absolutePath,
          kind: entry.kind,
          exists: false,
        };
      }
    }),
  );

  let exists = false;

  try {
    await fs.access(workspaceRoot);
    exists = true;
  } catch {
    exists = false;
  }

  const settings = exists ? await readWorkspaceSettings(workspaceRoot) : null;
  const dbPath = resolveWithinWorkspaceRoot(workspaceRoot, ".research-wiki", "app.db");
  const databaseState = inspectDatabase(dbPath);
  const workspaceRecord = exists ? await getWorkspaceRecord(workspaceRoot) : null;
  const gitInitialized = exists ? await isGitRepository(workspaceRoot) : false;
  const initialized =
    exists &&
    requiredPaths.every((entry) => entry.exists) &&
    Boolean(settings) &&
    databaseState.tables.includes("workspaces");

  return {
    workspaceRoot,
    exists,
    initialized,
    gitInitialized,
    databaseInitialized: databaseState.tables.includes("workspaces"),
    databaseTables: databaseState.tables,
    requiredPaths,
    settings,
    workspaceRecord,
  };
}
