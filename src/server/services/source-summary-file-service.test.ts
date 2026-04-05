import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SourceSummaryArtifact } from "@/lib/contracts/source-summary";
import { initializeWorkspace } from "@/server/services/workspace-service";
import {
  readSourceSummaryArtifactJson,
  readSourceSummaryArtifactMarkdown,
  writeSourceSummaryArtifacts,
} from "@/server/services/source-summary-file-service";

describe("source summary file service", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-summary-files-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Summary Files Workspace",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("writes and reads markdown plus json summary artifacts inside the workspace", async () => {
    const artifact: SourceSummaryArtifact = {
      schemaVersion: "m3-source-summary-v1",
      sourceId: "src_123",
      sourceTitle: "Local First Notes",
      sourceType: "markdown",
      generatedAt: "2026-04-04T00:00:00.000Z",
      provider: "openai",
      model: "gpt-test",
      promptHash: "abc123",
      chunkStrategy: "direct",
      content: {
        conciseSummary: "A short summary.",
        keyEntities: [
          {
            name: "Ink & Switch",
            description: "Research lab reference.",
            aliases: [],
          },
        ],
        keyConcepts: [
          {
            name: "Local-first software",
            description: "Software that keeps user data local by default.",
          },
        ],
        majorClaims: [
          {
            text: "Local-first tools can improve trust.",
            polarity: "supports",
            evidenceStrength: "medium",
            rationale: "The source argues for inspectable local data ownership.",
          },
        ],
        openQuestions: ["How should collaboration work later?"],
        possibleTargetPageHints: [
          {
            title: "Local-first software",
            pageType: "concept",
            rationale: "The source centers the concept repeatedly.",
          },
        ],
      },
    };

    const paths = await writeSourceSummaryArtifacts({
      workspaceRoot,
      sourceId: artifact.sourceId,
      sourceSlug: "local-first-notes",
      markdown: "# Summary\n\nA short summary.\n",
      artifact,
    });

    expect(paths.markdownPath).toContain("raw/processed/summaries");
    expect(paths.jsonPath).toContain("raw/processed/summaries");
    expect(await readSourceSummaryArtifactMarkdown(workspaceRoot, paths.markdownPath)).toContain(
      "A short summary.",
    );
    expect(await readSourceSummaryArtifactJson(workspaceRoot, paths.jsonPath)).toEqual(artifact);
  });
});
