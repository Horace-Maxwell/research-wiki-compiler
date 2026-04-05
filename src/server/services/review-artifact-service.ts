import type { ReviewProposalArtifact } from "@/lib/contracts/review";

export function buildReviewProposalMarkdown(artifact: ReviewProposalArtifact) {
  const targetPages = artifact.targetPages
    .map(
      (page) =>
        `- **${page.title}** (${page.type}, ${page.relation}) score ${page.recallScore}\n  Reasons: ${page.recallReasons
          .map((reason) => `${reason.label} (+${reason.score})`)
          .join("; ")}`,
    )
    .join("\n");
  const claims = artifact.supportingClaims
    .map(
      (claim) =>
        `- **${claim.polarity} / ${claim.evidenceStrength}**: ${claim.text}\n  Rationale: ${claim.rationale}`,
    )
    .join("\n");
  const hunks = artifact.hunks
    .map((hunk) =>
      [
        `### ${hunk.sectionHeading ?? "Unsectioned change"}`,
        `- Operation: ${hunk.operation}`,
        "",
        "```md",
        hunk.afterText,
        "```",
      ].join("\n"),
    )
    .join("\n\n");
  const reviewLines = [
    `- Reviewed at: ${artifact.review.reviewedAt ?? "Not reviewed yet"}`,
    `- Review note: ${artifact.review.note ?? "None"}`,
    `- Edited before apply: ${artifact.review.editedBeforeApply ? "yes" : "no"}`,
  ].join("\n");
  const applyLines = [
    `- Applied at: ${artifact.applyResult.appliedAt ?? "Not applied yet"}`,
    `- Apply success: ${artifact.applyResult.success === null ? "Not attempted" : artifact.applyResult.success ? "yes" : "no"}`,
    `- Applied page id: ${artifact.applyResult.appliedPageId ?? "None"}`,
    `- Affected paths: ${artifact.applyResult.affectedPaths.join(", ") || "None"}`,
    `- Git: ${
      artifact.applyResult.git
        ? `${artifact.applyResult.git.attempted ? "attempted" : "not attempted"} / ${artifact.applyResult.git.success === null ? "n/a" : artifact.applyResult.git.success ? "success" : "failed"}`
        : "Not attempted"
    }`,
    `- Apply error: ${artifact.applyResult.error ?? "None"}`,
  ].join("\n");

  return [
    `# ${artifact.title}`,
    "",
    `- Proposal ID: \`${artifact.proposalId}\``,
    `- Source ID: \`${artifact.sourceId}\``,
    `- Status: ${artifact.status}`,
    `- Proposal type: ${artifact.proposalType}`,
    `- Risk level: ${artifact.riskLevel}`,
    `- Generated at: ${artifact.generatedAt}`,
    `- Provider: ${artifact.provider}`,
    `- Model: ${artifact.model}`,
    `- Prompt version: ${artifact.promptVersion}`,
    `- Prompt hash: \`${artifact.promptHash}\``,
    "",
    "## Patch Goal",
    artifact.patchGoal,
    "",
    "## Rationale",
    artifact.rationale,
    "",
    "## Target Pages",
    targetPages || "- No existing page targets. This proposal suggests a new page.",
    "",
    "## Proposed New Page",
    artifact.proposedPage
      ? `- **${artifact.proposedPage.title}** (${artifact.proposedPage.pageType})\n- Suggested path: \`${artifact.proposedPage.suggestedPath}\`\n- Rationale: ${artifact.proposedPage.rationale}`
      : "- None.",
    "",
    "## Affected Sections",
    artifact.affectedSections.length > 0
      ? artifact.affectedSections.map((section) => `- ${section}`).join("\n")
      : "- None specified.",
    "",
    "## Supporting Claims",
    claims || "- No specific claims referenced.",
    "",
    "## Conflict Notes",
    artifact.conflictNotes.length > 0
      ? artifact.conflictNotes.map((note) => `- ${note}`).join("\n")
      : "- No conflicts identified.",
    "",
    "## Candidate Recall Snapshot",
    artifact.candidateRecall.primaryCandidates
      .map((candidate) => `- **${candidate.title}** (${candidate.type}) score ${candidate.score}`)
      .join("\n") || "- No candidates recorded.",
    "",
    "## Review Outcome",
    reviewLines,
    "",
    "## Apply Result",
    applyLines,
    "",
    "## Proposed Hunks",
    hunks || "- No hunk details emitted.",
    "",
  ].join("\n");
}
