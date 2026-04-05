import path from "node:path";

import { runWorkspaceMigrations } from "@/server/db/client";
import { normalizeWorkspaceRoot } from "@/server/lib/path-safety";
import { requireWorkspaceRecord } from "@/server/services/workspace-service";

export async function getWorkspaceContext(workspaceRoot: string) {
  const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
  const workspace = await requireWorkspaceRecord(normalizedWorkspaceRoot);
  const dbPath = path.join(normalizedWorkspaceRoot, ".research-wiki", "app.db");
  const db = runWorkspaceMigrations(dbPath);

  return {
    db,
    workspace,
    workspaceRoot: normalizedWorkspaceRoot,
  };
}
