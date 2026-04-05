import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSourceDetail, importSource } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

describe("source summary service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-summary-workspace-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Summary Workspace",
      initializeGit: false,
    });

    await updateWorkspaceLlmSettings(workspaceRoot, {
      provider: "openai",
      model: null,
      openai: {
        apiKey: "sk-test",
        model: "gpt-test",
      },
      anthropic: {
        apiKey: null,
        model: null,
      },
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("summarizes a processed source and persists visible artifacts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  conciseSummary: "A source about local-first collaboration.",
                  keyEntities: [
                    {
                      name: "Ink & Switch",
                      description: "Research group cited in the source.",
                      aliases: [],
                    },
                  ],
                  keyConcepts: [
                    {
                      name: "Local-first software",
                      description: "Applications that preserve local ownership of data.",
                    },
                  ],
                  majorClaims: [
                    {
                      text: "Local-first tools can improve user trust.",
                      polarity: "supports",
                      evidenceStrength: "medium",
                      rationale: "The source argues that visibility and control improve trust.",
                    },
                  ],
                  openQuestions: ["How should review workflows scale over time?"],
                  possibleTargetPageHints: [
                    {
                      title: "Local-first software",
                      pageType: "concept",
                      rationale: "The source repeatedly centers the concept.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const imported = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Local First Source",
      filename: "local-first.md",
      text: "# Local First\n\nTrust comes from visible, local data.\n",
    });

    expect(imported.summary.status).toBe("not_started");

    const summarized = await summarizeSource(workspaceRoot, imported.id);

    expect(summarized.summary.status).toBe("completed");
    expect(summarized.summary.markdownPath).toContain("raw/processed/summaries");
    expect(summarized.summary.jsonPath).toContain("raw/processed/summaries");
    expect(summarized.summary.artifact?.content.keyEntities[0]?.name).toBe("Ink & Switch");
    expect(summarized.summary.markdown).toContain("Concise Summary");

    const markdownArtifact = await fs.readFile(
      path.join(workspaceRoot, summarized.summary.markdownPath!),
      "utf8",
    );

    expect(markdownArtifact).toContain("Local First Source Summary");

    const detail = await getSourceDetail(workspaceRoot, imported.id);

    expect(detail.summary.status).toBe("completed");
    expect(detail.summary.latestJobRun?.status).toBe("completed");
  });

  it("records a failed summary run and allows a later retry to succeed", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  invalid: true,
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const imported = await importSource({
      workspaceRoot,
      importKind: "browser_file",
      filename: "compiler-notes.txt",
      content: "Compiler notes\n\nSummaries should stay inspectable.\n",
    });

    await expect(summarizeSource(workspaceRoot, imported.id)).rejects.toThrowError(
      "The summarization provider returned invalid structured output.",
    );

    const failed = await getSourceDetail(workspaceRoot, imported.id);

    expect(failed.summary.status).toBe("failed");
    expect(failed.summary.latestJobRun?.status).toBe("failed");

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  conciseSummary: "A note about inspectable summaries.",
                  keyEntities: [],
                  keyConcepts: [
                    {
                      name: "Inspectable summaries",
                      description: "Summary artifacts that remain visible on disk.",
                    },
                  ],
                  majorClaims: [
                    {
                      text: "Summary artifacts should remain visible.",
                      polarity: "supports",
                      evidenceStrength: "high",
                      rationale: "The note states this directly.",
                    },
                  ],
                  openQuestions: [],
                  possibleTargetPageHints: [],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const retried = await summarizeSource(workspaceRoot, imported.id);

    expect(retried.summary.status).toBe("completed");
    expect(retried.summary.latestJobRun?.status).toBe("completed");
  });
});
