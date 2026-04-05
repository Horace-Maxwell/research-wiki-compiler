import fs from "node:fs/promises";
import path from "node:path";

import {
  type WorkspaceLlmSettings,
  type WorkspaceReviewSettings,
  type WorkspaceSettings,
  workspaceSettingsSchema,
} from "@/lib/contracts/workspace";
import { appSettings } from "@/server/db/schema";
import { runWorkspaceMigrations } from "@/server/db/client";
import { AppError } from "@/server/lib/errors";
import {
  normalizeWorkspaceRoot,
  resolveWithinWorkspaceRoot,
} from "@/server/lib/path-safety";
import { requireWorkspaceRecord } from "@/server/services/workspace-service";

type SettingsSeed = {
  workspaceName: string;
  workspaceRoot: string;
  initializeGit: boolean;
};

export function buildWorkspaceSettings(seed: SettingsSeed): WorkspaceSettings {
  const timestamp = new Date().toISOString();

  return {
    version: "0.1.0",
    workspaceName: seed.workspaceName,
    workspaceRoot: seed.workspaceRoot,
    initializeGit: seed.initializeGit,
    llm: {
      provider: null,
      model: null,
      openai: {
        apiKey: null,
        model: null,
      },
      anthropic: {
        apiKey: null,
        model: null,
      },
    },
    review: {
      autoDraftLowRiskPatches: false,
      gitCommitOnApply: false,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function readWorkspaceSettings(workspaceRoot: string) {
  const settingsPath = resolveWithinWorkspaceRoot(
    workspaceRoot,
    ".research-wiki",
    "settings.json",
  );

  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return workspaceSettingsSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw new AppError(
      "Failed to read workspace settings.",
      500,
      "workspace_settings_read_failed",
      error,
    );
  }
}

async function syncWorkspaceSettingsRecord(
  workspaceRoot: string,
  settings: WorkspaceSettings,
) {
  const workspace = await requireWorkspaceRecord(workspaceRoot);
  const dbPath = path.join(workspaceRoot, ".research-wiki", "app.db");
  const db = runWorkspaceMigrations(dbPath);
  const timestamp = new Date(settings.updatedAt);

  await db
    .insert(appSettings)
    .values({
      id: `setting_${workspace.id}`,
      workspaceId: workspace.id,
      key: "workspace_settings",
      valueJson: settings,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [appSettings.workspaceId, appSettings.key],
      set: {
        valueJson: settings,
        updatedAt: timestamp,
      },
    });
}

export async function writeWorkspaceSettings(
  workspaceRoot: string,
  settings: WorkspaceSettings,
) {
  const settingsPath = resolveWithinWorkspaceRoot(
    workspaceRoot,
    ".research-wiki",
    "settings.json",
  );

  try {
    await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new AppError(
      "Failed to write workspace settings.",
      500,
      "workspace_settings_write_failed",
      error,
    );
  }
}

export async function updateWorkspaceLlmSettings(
  workspaceRoot: string,
  llmSettings: WorkspaceLlmSettings,
) {
  const existing = await readWorkspaceSettings(normalizeWorkspaceRoot(workspaceRoot));

  if (!existing) {
    throw new AppError(
      "Workspace settings do not exist yet.",
      400,
      "workspace_settings_missing",
    );
  }

  return updateWorkspaceSettings(workspaceRoot, {
    llm: llmSettings,
    review: existing.review,
  });
}

export async function updateWorkspaceSettings(
  workspaceRoot: string,
  nextValues: {
    llm: WorkspaceLlmSettings;
    review: WorkspaceReviewSettings;
  },
) {
  const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
  const existing = await readWorkspaceSettings(normalizedWorkspaceRoot);

  if (!existing) {
    throw new AppError(
      "Workspace settings do not exist yet.",
      400,
      "workspace_settings_missing",
    );
  }

  const nextSettings = workspaceSettingsSchema.parse({
    ...existing,
    llm: nextValues.llm,
    review: nextValues.review,
    updatedAt: new Date().toISOString(),
  });

  await writeWorkspaceSettings(normalizedWorkspaceRoot, nextSettings);
  await syncWorkspaceSettingsRecord(normalizedWorkspaceRoot, nextSettings);

  return nextSettings;
}
