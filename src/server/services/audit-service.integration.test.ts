import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAuditRunDetail,
  listAuditRuns,
  runAudit,
} from "@/server/services/audit-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import { importSource } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { writeWikiMarkdownFile } from "@/server/services/wiki-file-service";
import {
  createWikiPage,
  getWikiPageDetail,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

function openAiResponse(payload: unknown) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(payload),
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
  );
}

async function configureLlm(workspaceRoot: string) {
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
}

async function importAndSummarize(params: {
  workspaceRoot: string;
  title: string;
  text: string;
}) {
  const source = await importSource({
    workspaceRoot: params.workspaceRoot,
    importKind: "pasted_text",
    title: params.title,
    text: params.text,
  });

  await summarizeSource(params.workspaceRoot, source.id);

  return source;
}

describe("audit service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-audit-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Audit Workspace",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("detects contradictions across summarized source claims and persists the report history", async () => {
    await configureLlm(workspaceRoot);

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        openAiResponse({
          conciseSummary: "A pro-remote summary.",
          keyEntities: [],
          keyConcepts: [
            {
              name: "Remote-first teams",
              description: "Teams that work primarily asynchronously.",
            },
          ],
          majorClaims: [
            {
              text: "Remote-first teams outperform colocated teams in 2024.",
              polarity: "supports",
              evidenceStrength: "high",
              rationale: "The source frames remote-first performance as stronger.",
            },
          ],
          openQuestions: [],
          possibleTargetPageHints: [],
        }),
      )
      .mockResolvedValueOnce(
        openAiResponse({
          conciseSummary: "A skeptical remote-work summary.",
          keyEntities: [],
          keyConcepts: [
            {
              name: "Remote-first teams",
              description: "Teams that work primarily asynchronously.",
            },
          ],
          majorClaims: [
            {
              text: "Remote-first teams outperform colocated teams in 2024.",
              polarity: "contradicts",
              evidenceStrength: "high",
              rationale: "The source argues the opposite outcome from the same claim.",
            },
          ],
          openQuestions: [],
          possibleTargetPageHints: [],
        }),
      );

    const left = await importAndSummarize({
      workspaceRoot,
      title: "Remote teams benchmark A",
      text: "Remote-first teams outperform colocated teams in 2024 according to this note.",
    });
    const right = await importAndSummarize({
      workspaceRoot,
      title: "Remote teams benchmark B",
      text: "This note argues the same benchmark points in the opposite direction.",
    });

    const audit = await runAudit(workspaceRoot, "contradiction");

    expect(audit.reportPath).toMatch(/^audits\/.+\.md$/);
    expect(audit.findings.length).toBeGreaterThan(0);
    expect(audit.findings[0]?.severity).toBe("high");
    expect(audit.findings[0]?.relatedSourceIds).toEqual(
      expect.arrayContaining([left.id, right.id]),
    );
    expect(audit.reportMarkdown).toContain("# Contradiction Audit");

    const markdown = await fs.readFile(path.join(workspaceRoot, audit.reportPath!), "utf8");

    expect(markdown).toContain("Potential contradiction across summarized claims");

    const history = await listAuditRuns(workspaceRoot);
    const detail = await getAuditRunDetail(workspaceRoot, audit.id);

    expect(history.some((entry) => entry.id === audit.id)).toBe(true);
    expect(detail.id).toBe(audit.id);
    expect(detail.findings.length).toBe(audit.findings.length);
  });

  it("detects recurring concepts that still lack wiki coverage", async () => {
    await configureLlm(workspaceRoot);

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        openAiResponse({
          conciseSummary: "Compiled wiki framing.",
          keyEntities: [],
          keyConcepts: [
            {
              name: "Knowledge compiler",
              description: "A workflow that compiles raw research into durable pages.",
            },
          ],
          majorClaims: [],
          openQuestions: [],
          possibleTargetPageHints: [],
        }),
      )
      .mockResolvedValueOnce(
        openAiResponse({
          conciseSummary: "Second knowledge compiler note.",
          keyEntities: [],
          keyConcepts: [
            {
              name: "Knowledge compiler",
              description: "A workflow that compiles raw research into durable pages.",
            },
          ],
          majorClaims: [],
          openQuestions: [],
          possibleTargetPageHints: [],
        }),
      );

    await importAndSummarize({
      workspaceRoot,
      title: "Compiler note A",
      text: "A knowledge compiler turns raw material into a durable wiki.",
    });
    await importAndSummarize({
      workspaceRoot,
      title: "Compiler note B",
      text: "The knowledge compiler idea appears again in this source.",
    });

    const audit = await runAudit(workspaceRoot, "coverage");
    const coverageFinding = audit.findings.find((finding) => finding.mode === "coverage");

    expect(coverageFinding).toBeTruthy();
    expect(coverageFinding?.title).toContain("wiki coverage");
    expect(coverageFinding?.note).toContain("Knowledge compiler");
    expect(coverageFinding?.relatedSourceIds.length).toBe(2);
  });

  it("detects orphan pages with no meaningful links", async () => {
    const orphanPage = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Unlinked research topic",
    });

    const audit = await runAudit(workspaceRoot, "orphan");

    expect(
      audit.findings.some((finding) => finding.relatedPageIds.includes(orphanPage.id)),
    ).toBe(true);
  });

  it("detects stale pages that remain referenced long after their last update", async () => {
    const targetPage = await createWikiPage({
      workspaceRoot,
      type: "concept",
      title: "Durable wiki loop",
    });
    const oldDate = "2025-01-01T00:00:00.000Z";
    const staleRawContent = targetPage.rawContent
      .replace(/^updated_at:.*$/m, `updated_at: ${oldDate}`)
      .replace(
        "## Summary\n\nTBD\n",
        "## Summary\n\nDurable wiki loops keep compiled knowledge visible, but they still need regular maintenance to stay trustworthy over time.\n",
      );

    await writeWikiMarkdownFile(workspaceRoot, targetPage.path, staleRawContent);

    const firstReferrer = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Durable wiki references A",
    });
    const secondReferrer = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Durable wiki references B",
    });
    const thirdReferrer = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Durable wiki references C",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: firstReferrer.id,
      rawContent: firstReferrer.rawContent
        .replace("page_refs: []", "page_refs:\n  - Durable wiki loop")
        .replace(
          "## Summary\n\nTBD\n",
          "## Summary\n\n[[Durable wiki loop]] remains central to how this workspace organizes research.\n",
        ),
    });
    await updateWikiPage({
      workspaceRoot,
      pageId: secondReferrer.id,
      rawContent: secondReferrer.rawContent
        .replace("page_refs: []", "page_refs:\n  - Durable wiki loop")
        .replace(
          "## Summary\n\nTBD\n",
          "## Summary\n\nThis page links back to [[Durable wiki loop]] because the concept still shapes later synthesis work.\n",
        ),
    });
    await updateWikiPage({
      workspaceRoot,
      pageId: thirdReferrer.id,
      rawContent: thirdReferrer.rawContent
        .replace("page_refs: []", "page_refs:\n  - Durable wiki loop")
        .replace(
          "## Summary\n\nTBD\n",
          "## Summary\n\nA third page keeps [[Durable wiki loop]] in circulation as an active reference point.\n",
        ),
    });

    const refreshedTarget = await getWikiPageDetail(workspaceRoot, targetPage.id);
    const refreshedReferrer = await getWikiPageDetail(workspaceRoot, firstReferrer.id);

    expect(refreshedTarget.frontmatter.updated_at).toBe(oldDate);
    expect(refreshedReferrer.frontmatter.page_refs).toContain("Durable wiki loop");

    const audit = await runAudit(workspaceRoot, "stale");
    const staleFinding = audit.findings.find((finding) =>
      finding.relatedPageIds.includes(targetPage.id),
    );

    expect(staleFinding).toBeTruthy();
    expect(staleFinding?.note).toContain("has not been updated");
  });

  it("detects substantive wiki pages that lack valid source grounding", async () => {
    const unsupportedPage = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Unsupported synthesis",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: unsupportedPage.id,
      rawContent: unsupportedPage.rawContent.replace(
        "## Summary\n\nTBD\n",
        "## Summary\n\nThis page makes a substantive claim about how research compilers should work, but it does so without any linked source references in frontmatter.\n",
      ),
    });

    const audit = await runAudit(workspaceRoot, "unsupported_claims");
    const unsupportedFinding = audit.findings.find((finding) =>
      finding.relatedPageIds.includes(unsupportedPage.id),
    );

    expect(unsupportedFinding).toBeTruthy();
    expect(unsupportedFinding?.severity).toBe("high");
    expect(unsupportedFinding?.note).toContain("does not reference any source documents");
  });
});
