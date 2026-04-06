import type { EvidenceBundleSeed, EvidenceChangeSeed } from "@/lib/contracts/evidence-change";
import type { ResearchQuestionSeed, ResearchQuestionStatus } from "@/lib/contracts/research-question";
import type { ResearchSessionSeed } from "@/lib/contracts/research-session";
import type { ResearchSynthesisSeed } from "@/lib/contracts/research-synthesis";

export type KnowledgeSurfaceKind =
  | "canonical"
  | "working"
  | "monitoring"
  | "navigation"
  | "artifact";

export type KnowledgeSurfaceTemplate = {
  title: string;
  purpose: string;
  role: string;
  surfaceKind: KnowledgeSurfaceKind;
  revisitCadence?: string;
  refreshTriggers?: string[];
};

export type KnowledgeReadingPassTemplate = {
  title: string;
  description: string;
  steps: string[];
};

export type KnowledgeContextPackTemplate = {
  title: string;
  useWhen: string;
  load: string[];
  optional?: string[];
  keepActive?: string[];
  walkOrder?: string[];
};

export type KnowledgeRevisitItem = {
  title: string;
  why: string;
  trigger: string;
};

export type KnowledgeContextRefreshItem = {
  title: string;
  trigger: string;
  load: string[];
};

export type KnowledgeSynthesisCandidate = {
  title: string;
  whyNow: string;
  load: string[];
};

export type KnowledgeAuditAction = {
  signal: string;
  nextSurface: string;
  action: string;
};

export type KnowledgeMethodTemplateData = {
  workspaceFlavor?: "compiled-example" | "starter-topic";
  topicTitle: string;
  indexTitle: string;
  readingPathsTitle: string;
  currentTensionsTitle: string;
  openQuestionsTitle: string;
  maintenanceWatchpointsTitle: string;
  maintenanceRhythmTitle: string;
  archivedNoteTitle: string;
  canonicalSurfaces: KnowledgeSurfaceTemplate[];
  workingSurfaces: KnowledgeSurfaceTemplate[];
  monitoringSurfaces: KnowledgeSurfaceTemplate[];
  artifactSurfaces: KnowledgeSurfaceTemplate[];
  readingPasses: KnowledgeReadingPassTemplate[];
  tensionsSummary: string;
  tensions: string[];
  tensionImportance: string[];
  openQuestionsSummary: string;
  openQuestions: string[];
  researchQuestions: ResearchQuestionSeed[];
  researchSessions: ResearchSessionSeed[];
  researchSyntheses: ResearchSynthesisSeed[];
  evidenceBundles: EvidenceBundleSeed[];
  evidenceChanges: EvidenceChangeSeed[];
  resolutionSignals: string[];
  revisitQueue: KnowledgeRevisitItem[];
  contextPackRefreshes: KnowledgeContextRefreshItem[];
  synthesisCandidates: KnowledgeSynthesisCandidate[];
  auditActions: KnowledgeAuditAction[];
  contextPacks: KnowledgeContextPackTemplate[];
  corpusNotes: string[];
  artifactLadder: string[];
};

export type KnowledgeMethodPack = {
  wiki: {
    index: string;
    readingPaths: string;
    currentTensions: string;
    openQuestions: string;
    maintenanceWatchpoints: string;
    maintenanceRhythm: string;
  };
  obsidian: {
    readme: string;
    atlas: Record<string, string>;
    contextPacks: Record<string, string>;
  };
};

function wikiLink(title: string) {
  return `[[${title}]]`;
}

function titleKey(title: string) {
  return title.trim().toLowerCase();
}

function uniqueTitles(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function cleanSentenceFragment(value: string) {
  return value.trim().replace(/[.。]+$/g, "");
}

function humanizeQuestionStatus(status: ResearchQuestionStatus) {
  switch (status) {
    case "ready-for-synthesis":
      return "ready for synthesis";
    case "waiting-for-sources":
      return "waiting for sources";
    default:
      return status.replace(/-/g, " ");
  }
}

function humanizeSessionStatus(status: ResearchSessionSeed["status"]) {
  return status.replace(/-/g, " ");
}

function humanizeSessionOutcome(outcome: ResearchSessionSeed["outcome"]) {
  return outcome ? outcome.replace(/-/g, " ") : "in progress";
}

function sessionStatusWeight(status: ResearchSessionSeed["status"]) {
  switch (status) {
    case "active":
      return 0;
    case "queued":
      return 1;
    case "completed":
    default:
      return 2;
  }
}

function sortResearchSessions(sessions: ResearchSessionSeed[]) {
  return [...sessions].sort((left, right) => {
    const statusDifference = sessionStatusWeight(left.status) - sessionStatusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(right.sessionDate).getTime() - new Date(left.sessionDate).getTime();
  });
}

function findResearchQuestion(
  data: KnowledgeMethodTemplateData,
  questionId: string,
) {
  return data.researchQuestions.find((question) => question.id === questionId) ?? null;
}

function queuedResearchSessions(data: KnowledgeMethodTemplateData) {
  return sortResearchSessions(
    data.researchSessions.filter((session) => session.status === "active" || session.status === "queued"),
  );
}

function recentCompletedResearchSessions(data: KnowledgeMethodTemplateData) {
  return sortResearchSessions(
    data.researchSessions.filter((session) => session.status === "completed"),
  ).slice(0, 4);
}

function humanizeSynthesisStatus(status: ResearchSynthesisSeed["status"]) {
  return status.replace(/-/g, " ");
}

function synthesisStatusWeight(status: ResearchSynthesisSeed["status"]) {
  switch (status) {
    case "ready":
      return 0;
    case "in-progress":
      return 1;
    case "candidate":
      return 2;
    case "stale":
      return 3;
    case "published":
    default:
      return 4;
  }
}

function sortResearchSyntheses(syntheses: ResearchSynthesisSeed[]) {
  return [...syntheses].sort((left, right) => {
    const statusDifference = synthesisStatusWeight(left.status) - synthesisStatusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (left.confidencePercent !== right.confidencePercent) {
      return right.confidencePercent - left.confidencePercent;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function recentPublishedResearchSyntheses(data: KnowledgeMethodTemplateData) {
  return [...data.researchSyntheses]
    .filter((synthesis) => synthesis.status === "published")
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 4);
}

function actionableResearchSyntheses(data: KnowledgeMethodTemplateData) {
  return sortResearchSyntheses(
    data.researchSyntheses.filter(
      (synthesis) =>
        synthesis.status === "candidate" ||
        synthesis.status === "in-progress" ||
        synthesis.status === "ready",
    ),
  );
}

function findResearchSession(
  data: KnowledgeMethodTemplateData,
  sessionId: string,
) {
  return data.researchSessions.find((session) => session.id === sessionId) ?? null;
}

function humanizeSynthesisDecisionType(type: ResearchSynthesisSeed["decisions"][number]["type"]) {
  switch (type) {
    case "not-enough-evidence":
      return "not enough evidence";
    default:
      return type.replace(/-/g, " ");
  }
}

function humanizeQuestionEffect(effect: ResearchSynthesisSeed["questionImpacts"][number]["effect"]) {
  return effect.replace(/-/g, " ");
}

function formatSynthesisSourceQuestions(
  data: KnowledgeMethodTemplateData,
  questionIds: string[],
) {
  return uniqueTitles(
    questionIds.map((questionId) => findResearchQuestion(data, questionId)?.question ?? questionId),
  ).join("; ");
}

function formatSynthesisSourceSessions(
  data: KnowledgeMethodTemplateData,
  sessionIds: string[],
) {
  return uniqueTitles(
    sessionIds.map((sessionId) => findResearchSession(data, sessionId)?.title ?? sessionId),
  ).join("; ");
}

function formatSynthesisUpdateTargets(synthesis: ResearchSynthesisSeed) {
  const titles = uniqueTitles([
    ...synthesis.canonicalUpdateTitles,
    ...synthesis.maintenanceUpdateTitles,
    ...synthesis.watchpointUpdateTitles,
    ...synthesis.tensionUpdateTitles,
    ...synthesis.archiveTitles,
  ]);

  return titles.length > 0 ? formatQuestionWikiLinks(titles) : "";
}

function buildSynthesisDecisionSection(data: KnowledgeMethodTemplateData) {
  const syntheses = actionableResearchSyntheses(data);

  if (syntheses.length === 0) {
    return [
      "## Synthesis decisions",
      "",
      "- No actionable synthesis candidates are seeded yet.",
    ].join("\n");
  }

  return [
    "## Synthesis decisions",
    "",
    ...syntheses.flatMap((synthesis) => {
      const sourceQuestions = formatSynthesisSourceQuestions(data, synthesis.sourceQuestionIds);
      const sourceSessions = formatSynthesisSourceSessions(data, synthesis.sourceSessionIds);
      const updateTargets = formatSynthesisUpdateTargets(synthesis);
      const questionImpacts = synthesis.questionImpacts
        .map((impact) => {
          const question = findResearchQuestion(data, impact.questionId);
          return `${question?.question ?? impact.questionId} (${humanizeQuestionEffect(impact.effect)}): ${impact.note}`;
        })
        .join(" ");

      const lines = [
        `### ${synthesis.title}`,
        "",
        `- **Status**: ${humanizeSynthesisStatus(synthesis.status)}`,
        `- **Confidence**: ${synthesis.confidencePercent}%`,
        `- **Source questions**: ${sourceQuestions}`,
        `- **Durable conclusion**: ${synthesis.durableConclusion}`,
      ];

      if (sourceSessions) {
        lines.push(`- **Source sessions**: ${sourceSessions}`);
      }

      if (synthesis.provisionalBoundary) {
        lines.push(`- **Keep provisional**: ${synthesis.provisionalBoundary}`);
      }

      for (const decision of synthesis.decisions) {
        lines.push(
          `- **Decision (${humanizeSynthesisDecisionType(decision.type)})**: ${decision.title}. ${decision.summary} ${decision.action}`,
        );
      }

      if (questionImpacts) {
        lines.push(`- **Question effects**: ${questionImpacts}`);
      }

      if (synthesis.changedCanonicalSummary) {
        lines.push(`- **Canonical effect**: ${synthesis.changedCanonicalSummary}`);
      }

      if (updateTargets) {
        lines.push(`- **Update surfaces**: ${updateTargets}`);
      }

      lines.push(`- **Next step**: ${synthesis.recommendedNextStep}`);
      lines.push("");

      return lines;
    }),
  ]
    .join("\n")
    .trim();
}

function buildPublishedSynthesisSection(data: KnowledgeMethodTemplateData) {
  const syntheses = recentPublishedResearchSyntheses(data);

  if (syntheses.length === 0) {
    return [
      "## Published syntheses",
      "",
      "- No published syntheses are seeded yet.",
    ].join("\n");
  }

  return [
    "## Published syntheses",
    "",
    ...syntheses.flatMap((synthesis) => {
      const sourceQuestions = formatSynthesisSourceQuestions(data, synthesis.sourceQuestionIds);
      const sourceSessions = formatSynthesisSourceSessions(data, synthesis.sourceSessionIds);
      const questionImpacts = synthesis.questionImpacts
        .map((impact) => {
          const question = findResearchQuestion(data, impact.questionId);
          return `${question?.question ?? impact.questionId} (${humanizeQuestionEffect(impact.effect)}): ${impact.note}`;
        })
        .join(" ");
      const updateTargets = formatSynthesisUpdateTargets(synthesis);
      const lines = [
        `### ${synthesis.title}`,
        "",
        `- **Published surface**: ${wikiLink(synthesis.publishedPageTitle ?? synthesis.title)}`,
        `- **Source questions**: ${sourceQuestions}`,
        `- **Durable conclusion**: ${synthesis.durableConclusion}`,
      ];

      if (sourceSessions) {
        lines.push(`- **Source sessions**: ${sourceSessions}`);
      }

      if (synthesis.changedCanonicalSummary) {
        lines.push(`- **What changed**: ${synthesis.changedCanonicalSummary}`);
      }

      if (questionImpacts) {
        lines.push(`- **Question effects**: ${questionImpacts}`);
      }

      if (updateTargets) {
        lines.push(`- **Updated surfaces**: ${updateTargets}`);
      }

      if (synthesis.revisitTriggers.length > 0) {
        lines.push(`- **Revisit if**: ${synthesis.revisitTriggers.join("; ")}`);
      }

      lines.push("");
      return lines;
    }),
  ]
    .join("\n")
    .trim();
}

function openQuestionItems(data: KnowledgeMethodTemplateData) {
  if (data.researchQuestions.length > 0) {
    const openQuestionTexts = new Set(data.openQuestions.map((question) => question.trim().toLowerCase()));

    return data.researchQuestions.filter((question) => {
      if (question.status === "synthesized") {
        return false;
      }

      return openQuestionTexts.size === 0
        ? true
        : openQuestionTexts.has(question.question.trim().toLowerCase());
    });
  }

  return [];
}

function watchForReopenQuestions(data: KnowledgeMethodTemplateData) {
  return data.researchQuestions.filter(
    (question) => question.status === "synthesized" && question.reopenTriggers.length > 0,
  );
}

function formatQuestionWikiLinks(titles: string[]) {
  return uniqueTitles(titles)
    .map((title) => wikiLink(title))
    .join(", ");
}

function formatContextPackList(titles: string[], formatter: (title: string) => string) {
  return uniqueTitles(titles)
    .map((title) => formatter(title))
    .join(", ");
}

function buildQuestionWorkflowBlocks(
  data: KnowledgeMethodTemplateData,
  contextPackFormatter: (title: string) => string = wikiLink,
) {
  const questions = openQuestionItems(data);

  if (questions.length === 0) {
    return data.openQuestions.map((question) => `- ${question}`).join("\n");
  }

  return questions
    .map((question, index) => {
      const lines = [
        `### ${index + 1}. ${question.question}`,
        "",
        `- **Status**: ${humanizeQuestionStatus(question.status)}`,
        `- **Priority**: ${question.priority}`,
        `- **Load first**: ${contextPackFormatter(question.contextPackTitle)}`,
        `- **Why now**: ${question.whyNow}`,
      ];

      if (question.supportingContextPackTitles.length > 0) {
        lines.push(
          `- **Deepen with**: ${formatContextPackList(
            question.supportingContextPackTitles,
            contextPackFormatter,
          )}`,
        );
      }

      if (question.synthesizeInto) {
        lines.push(`- **Promote into**: ${question.synthesizeInto}`);
      }

      if (question.relatedPages.length > 0) {
        lines.push(`- **Related pages**: ${formatQuestionWikiLinks(question.relatedPages)}`);
      }

      if (question.relatedTensions.length > 0) {
        lines.push(`- **Linked tensions**: ${question.relatedTensions.join("; ")}`);
      }

      if (question.relatedWatchpoints.length > 0) {
        lines.push(`- **Watchpoints**: ${formatQuestionWikiLinks(question.relatedWatchpoints)}`);
      }

      if (question.sourceGaps.length > 0) {
        lines.push(`- **Missing evidence**: ${question.sourceGaps.join("; ")}`);
      } else if (question.evidenceToAdvance.length > 0) {
        lines.push(`- **Advance when**: ${question.evidenceToAdvance.join("; ")}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function buildQuestionReopenSection(
  data: KnowledgeMethodTemplateData,
  contextPackFormatter: (title: string) => string = wikiLink,
) {
  const questions = watchForReopenQuestions(data);

  if (questions.length === 0) {
    return "";
  }

  return [
    "## Reopen when the topic changes",
    "",
    ...questions.flatMap((question) => [
      `### ${question.question}`,
      "",
      `- **Currently grounded in**: ${
        question.canonicalTargetTitle ? wikiLink(question.canonicalTargetTitle) : "a prior synthesis"
      }`,
      `- **Watch first**: ${contextPackFormatter(question.contextPackTitle)}`,
      `- **Reopen if**: ${question.reopenTriggers.join("; ")}`,
      "",
    ]),
  ]
    .join("\n")
    .trim();
}

function buildResearchSessionQueueSection(
  data: KnowledgeMethodTemplateData,
  contextPackFormatter: (title: string) => string = wikiLink,
) {
  const sessions = queuedResearchSessions(data);

  if (sessions.length === 0) {
    return [
      "## Session queue",
      "",
      "- No active or queued research sessions are seeded yet.",
    ].join("\n");
  }

  return [
    "## Session queue",
    "",
    ...sessions.flatMap((session) => {
      const question = findResearchQuestion(data, session.questionId);
      const durableTargets = uniqueTitles(
        [session.synthesisTitle, session.archiveTitle, session.canonicalUpdateTitle].filter(
          (value): value is string => Boolean(value),
        ),
      );

      const lines = [
        `### ${session.title}`,
        "",
        `- **Question**: ${question?.question ?? session.questionId}`,
        `- **Status**: ${humanizeSessionStatus(session.status)}`,
        `- **Load first**: ${formatContextPackList(session.loadedContextPackTitles, contextPackFormatter)}`,
        `- **Goal**: ${session.goal}`,
      ];

      if (session.supportingContextPackTitles.length > 0) {
        lines.push(
          `- **Deepen with**: ${formatContextPackList(
            session.supportingContextPackTitles,
            contextPackFormatter,
          )}`,
        );
      }

      if (durableTargets.length > 0) {
        lines.push(`- **Likely durable target**: ${formatQuestionWikiLinks(durableTargets)}`);
      }

      if (session.maintenanceUpdateTitles.length > 0) {
        lines.push(`- **Update next**: ${formatQuestionWikiLinks(session.maintenanceUpdateTitles)}`);
      }

      if (session.resumeNotes.length > 0) {
        lines.push(`- **Resume cue**: ${session.resumeNotes[0]}`);
      }

      lines.push(`- **Next step**: ${session.recommendedNextStep}`);
      lines.push("");

      return lines;
    }),
  ]
    .join("\n")
    .trim();
}

function buildResearchSessionOutcomeSection(
  data: KnowledgeMethodTemplateData,
  contextPackFormatter: (title: string) => string = wikiLink,
) {
  const sessions = recentCompletedResearchSessions(data);

  if (sessions.length === 0) {
    return [
      "## Recent session outcomes",
      "",
      "- No completed research sessions are seeded yet.",
    ].join("\n");
  }

  return [
    "## Recent session outcomes",
    "",
    ...sessions.flatMap((session) => {
      const question = findResearchQuestion(data, session.questionId);
      const durableTargets = uniqueTitles(
        [session.synthesisTitle, session.archiveTitle, session.canonicalUpdateTitle].filter(
          (value): value is string => Boolean(value),
        ),
      );
      const lines = [
        `### ${session.title}`,
        "",
        `- **Question**: ${question?.question ?? session.questionId}`,
        `- **Outcome**: ${humanizeSessionOutcome(session.outcome)}`,
        `- **Worked with**: ${formatContextPackList(session.loadedContextPackTitles, contextPackFormatter)}`,
        `- **What changed**: ${session.questionStatusChange?.reason ?? session.summary}`,
      ];

      if (durableTargets.length > 0) {
        lines.push(`- **Durable result**: ${formatQuestionWikiLinks(durableTargets)}`);
      }

      if (session.remainingUncertainty.length > 0) {
        lines.push(`- **Still unresolved**: ${session.remainingUncertainty.join("; ")}`);
      }

      lines.push(`- **Resume next**: ${session.recommendedNextStep}`);
      lines.push("");

      return lines;
    }),
  ]
    .join("\n")
    .trim();
}

function evidenceChangeStateWeight(state: EvidenceChangeSeed["state"]) {
  switch (state) {
    case "reopened":
      return 0;
    case "review-needed":
      return 1;
    case "stabilized":
    default:
      return 2;
  }
}

function evidenceChangePriorityWeight(priority: EvidenceChangeSeed["priority"]) {
  switch (priority) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
    default:
      return 2;
  }
}

function sortEvidenceChanges(changes: EvidenceChangeSeed[]) {
  return [...changes].sort((left, right) => {
    const stateDifference =
      evidenceChangeStateWeight(left.state) - evidenceChangeStateWeight(right.state);

    if (stateDifference !== 0) {
      return stateDifference;
    }

    const priorityDifference =
      evidenceChangePriorityWeight(left.priority) - evidenceChangePriorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime();
  });
}

function humanizeEvidenceChangeState(state: EvidenceChangeSeed["state"]) {
  return state.replace(/-/g, " ");
}

function humanizeEvidenceChangeType(changeType: EvidenceChangeSeed["changeType"]) {
  return changeType.replace(/-/g, " ");
}

function formatEvidenceChangeBundleTitles(
  data: KnowledgeMethodTemplateData,
  bundleIds: string[],
) {
  return uniqueTitles(
    bundleIds.map(
      (bundleId) =>
        data.evidenceBundles.find((bundle) => bundle.id === bundleId)?.title ?? bundleId,
    ),
  ).join(", ");
}

function formatEvidenceChangeQuestionTitles(
  data: KnowledgeMethodTemplateData,
  questionIds: string[],
) {
  return uniqueTitles(
    questionIds.map(
      (questionId) => findResearchQuestion(data, questionId)?.question ?? questionId,
    ),
  ).join("; ");
}

function formatEvidenceChangeSynthesisTitles(
  data: KnowledgeMethodTemplateData,
  synthesisIds: string[],
) {
  return uniqueTitles(
    synthesisIds.map(
      (synthesisId) =>
        data.researchSyntheses.find((synthesis) => synthesis.id === synthesisId)?.title ??
        synthesisId,
    ),
  ).join("; ");
}

function buildEvidenceChangeSection(data: KnowledgeMethodTemplateData) {
  const changes = sortEvidenceChanges(data.evidenceChanges);

  if (changes.length === 0) {
    return [
      "## Evidence changes to triage",
      "",
      "- No meaningful evidence changes are seeded yet.",
    ].join("\n");
  }

  return [
    "## Evidence changes to triage",
    "",
    ...changes.flatMap((change) => {
      const lines = [
        `### ${change.title}`,
        "",
        `- **State**: ${humanizeEvidenceChangeState(change.state)}`,
        `- **Change type**: ${humanizeEvidenceChangeType(change.changeType)}`,
        `- **Changed evidence**: ${formatEvidenceChangeBundleTitles(data, change.evidenceBundleIds)}`,
        `- **Why it matters**: ${change.whyItMatters}`,
        `- **Impact**: ${change.impactSummary}`,
      ];

      if (change.reopenQuestionIds.length > 0) {
        lines.push(
          `- **Reopen questions**: ${formatEvidenceChangeQuestionTitles(data, change.reopenQuestionIds)}`,
        );
      }

      if (change.staleSynthesisIds.length > 0) {
        lines.push(
          `- **Synthesis now stale**: ${formatEvidenceChangeSynthesisTitles(data, change.staleSynthesisIds)}`,
        );
      }

      if (change.canonicalReviewTitles.length > 0) {
        lines.push(`- **Review pages**: ${formatQuestionWikiLinks(change.canonicalReviewTitles)}`);
      }

      if (change.maintenanceActionTitles.length > 0) {
        lines.push(
          `- **Maintenance surfaces**: ${formatQuestionWikiLinks(change.maintenanceActionTitles)}`,
        );
      }

      if (change.likelyStableTitles.length > 0) {
        lines.push(`- **Likely stable**: ${formatQuestionWikiLinks(change.likelyStableTitles)}`);
      }

      lines.push(`- **Recommended action**: ${change.recommendedAction}`);
      lines.push("");

      return lines;
    }),
  ]
    .join("\n")
    .trim();
}

function buildReopenedByEvidenceSection(
  data: KnowledgeMethodTemplateData,
  contextPackFormatter: (title: string) => string = wikiLink,
) {
  const changes = sortEvidenceChanges(
    data.evidenceChanges.filter(
      (change) => change.state === "reopened" || change.reopenQuestionIds.length > 0,
    ),
  );

  if (changes.length === 0) {
    return [
      "## Reopened by evidence change",
      "",
      "- No explicit evidence-triggered reopen events are seeded yet.",
    ].join("\n");
  }

  return [
    "## Reopened by evidence change",
    "",
    ...changes.flatMap((change) => {
      const lines = [`### ${change.title}`, "", `- **Why now**: ${change.impactSummary}`];

      if (change.reopenQuestionIds.length > 0) {
        lines.push(
          ...change.reopenQuestionIds.map((questionId) => {
            const question = findResearchQuestion(data, questionId);
            const parts = [
              `- **${question?.question ?? questionId}**`,
              `load ${contextPackFormatter(question?.contextPackTitle ?? data.contextPacks[0]?.title ?? "LLM Context Pack")}`,
            ];

            if (question?.supportingContextPackTitles.length) {
              parts.push(
                `then deepen with ${formatContextPackList(
                  question.supportingContextPackTitles,
                  contextPackFormatter,
                )}`,
              );
            }

            return `${parts.join(", ")}.`;
          }),
        );
      }

      if (change.staleSynthesisIds.length > 0) {
        lines.push(
          `- **Synthesis to re-check**: ${formatEvidenceChangeSynthesisTitles(data, change.staleSynthesisIds)}`,
        );
      }

      if (change.canonicalReviewTitles.length > 0) {
        lines.push(`- **Review surfaces**: ${formatQuestionWikiLinks(change.canonicalReviewTitles)}`);
      }

      if (change.likelyStableTitles.length > 0) {
        lines.push(`- **Still likely stable**: ${formatQuestionWikiLinks(change.likelyStableTitles)}`);
      }

      lines.push(`- **Recommended action**: ${change.recommendedAction}`);
      lines.push("");

      return lines;
    }),
  ]
    .join("\n")
    .trim();
}

function formatLinkedList(titles: string[], ordered = false) {
  return titles
    .map((title, index) => `${ordered ? `${index + 1}.` : "-"} ${wikiLink(title)}`)
    .join("\n");
}

function formatSurfaceBullets(surfaces: KnowledgeSurfaceTemplate[]) {
  return surfaces
    .map((surface) => {
      const cadence = surface.revisitCadence
        ? ` Revisit: ${cleanSentenceFragment(surface.revisitCadence)}.`
        : "";
      return `- ${wikiLink(surface.title)}: ${cleanSentenceFragment(surface.purpose)}.${cadence}`;
    })
    .join("\n");
}

function getWorkspaceFlavor(data: KnowledgeMethodTemplateData) {
  return data.workspaceFlavor ?? "compiled-example";
}

function buildWikiOverviewText(data: KnowledgeMethodTemplateData) {
  if (getWorkspaceFlavor(data) === "starter-topic") {
    return `This topic workspace is a deterministic bootstrap built around a bounded ${data.topicTitle} corpus. It establishes canonical wiki pages, maintenance-facing working surfaces, an Obsidian projection, and validation targets before the topic moves into deeper summarize, review, archive, and audit loops.`;
  }

  return `This wiki is a compiled example built from a bounded ${data.topicTitle} corpus. It shows how the product turns raw source excerpts into summaries, reviewable patch proposals, durable wiki pages, grounded answers, archived notes, audits, and repeatable maintenance surfaces.`;
}

function buildObsidianProjectionIntro(data: KnowledgeMethodTemplateData) {
  if (getWorkspaceFlavor(data) === "starter-topic") {
    return `This folder is an Obsidian-first projection of the ${data.topicTitle} topic bootstrap. The source of truth still lives in \`../workspace/\`, while this vault reorganizes the same starter knowledge structure into a calmer map-of-content layout for reading, maintenance, iterative synthesis, and small context selection.`;
  }

  return `This folder is an Obsidian-first projection of the official ${data.topicTitle} example. The source of truth still lives in \`../workspace/\`, while this vault reorganizes the same compiled knowledge and artifact trail into a calmer map-of-content layout for reading, maintenance, iterative synthesis, and small context selection.`;
}

function buildStartHereIntro(data: KnowledgeMethodTemplateData) {
  if (getWorkspaceFlavor(data) === "starter-topic") {
    return `This vault takes the ${data.topicTitle} topic bootstrap and reshapes it for Obsidian usage: clear maps of content, article-first notes, visible provenance handoffs, compact maintenance surfaces, and small context packs for local reading or LLM-assisted work.`;
  }

  return `This vault takes the official ${data.topicTitle} example and reshapes it for Obsidian usage: clear maps of content, article-first notes, visible provenance, compact maintenance surfaces, and small context packs for local reading or LLM-assisted work.`;
}

function buildMaintenanceRhythmSummary(data: KnowledgeMethodTemplateData) {
  if (getWorkspaceFlavor(data) === "starter-topic") {
    return `This page is the maintenance control surface for the ${data.topicTitle} bootstrap. It turns the starter wiki into a durable daily workflow: what to revisit next, which compact context packs deserve refresh, what should graduate into synthesis, and where future audit findings should land.`;
  }

  return `This page is the maintenance control surface for the ${data.topicTitle} example. It turns the compiled wiki into a durable daily workflow: what to revisit next, which compact context packs deserve refresh, what should graduate into synthesis, and where audit findings should land.`;
}

function buildObsidianSourceFolderDescription(data: KnowledgeMethodTemplateData) {
  if (getWorkspaceFlavor(data) === "starter-topic") {
    return "- `20 Sources/`: the bounded starter corpus for this topic.";
  }

  return "- `20 Sources/`: the bounded user-first corpus used for the example.";
}

function buildObsidianProjectionIdentity(data: KnowledgeMethodTemplateData) {
  if (getWorkspaceFlavor(data) === "starter-topic") {
    return `- A projection of the committed ${data.topicTitle} bootstrap, not a second source-of-truth system.`;
  }

  return `- A projection of the committed ${data.topicTitle} example, not a second source-of-truth system.`;
}

export function findKnowledgeSurface(
  data: KnowledgeMethodTemplateData,
  title: string,
): KnowledgeSurfaceTemplate | null {
  const target = titleKey(title);
  const surface = [
    ...data.canonicalSurfaces,
    ...data.workingSurfaces,
    ...data.monitoringSurfaces,
    ...data.artifactSurfaces,
  ].find((entry) => titleKey(entry.title) === target);

  return surface ?? null;
}

function buildCanonicalVsWorkingSection(data: KnowledgeMethodTemplateData) {
  const canonical = data.canonicalSurfaces
    .map((surface) => `- ${wikiLink(surface.title)}: ${cleanSentenceFragment(surface.role)}.`)
    .join("\n");
  const working = [...data.workingSurfaces, ...data.monitoringSurfaces]
    .map((surface) => `- ${wikiLink(surface.title)}: ${cleanSentenceFragment(surface.role)}.`)
    .join("\n");

  return [
    "## Canonical vs working surfaces",
    "",
    "### Canonical durable surfaces",
    "",
    canonical,
    "",
    "### Working and maintenance surfaces",
    "",
    working,
  ].join("\n");
}

function buildContextPackRefreshSection(data: KnowledgeMethodTemplateData) {
  return [
    "## Context packs to refresh",
    "",
    ...data.contextPackRefreshes.map(
      (item) =>
        `- \`${item.title}\`: refresh when ${item.trigger}. Reload ${item.load
          .map((title) => wikiLink(title))
          .join(", ")}.`,
    ),
  ].join("\n");
}

function buildSynthesisCandidateSection(data: KnowledgeMethodTemplateData) {
  return [
    "## Synthesis candidates",
    "",
    ...data.synthesisCandidates.map(
      (candidate) =>
        `- **${candidate.title}**: ${candidate.whyNow} Start from ${candidate.load
          .map((title) => wikiLink(title))
          .join(", ")}.`,
    ),
  ].join("\n");
}

function buildAuditActionSection(data: KnowledgeMethodTemplateData) {
  return [
    "## Audit to action",
    "",
    ...data.auditActions.map(
      (item) =>
        `- ${item.signal} Move into ${wikiLink(item.nextSurface)} and ${item.action}`,
    ),
  ].join("\n");
}

function buildWikiIndexPage(data: KnowledgeMethodTemplateData) {
  const startHereTitles = uniqueTitles([
    data.canonicalSurfaces[0]?.title ?? data.topicTitle,
    data.currentTensionsTitle,
    data.canonicalSurfaces[1]?.title ?? "",
    data.canonicalSurfaces[2]?.title ?? "",
    data.canonicalSurfaces[3]?.title ?? "",
    data.maintenanceWatchpointsTitle,
    data.maintenanceRhythmTitle,
    data.readingPathsTitle,
    data.openQuestionsTitle,
    data.archivedNoteTitle,
  ]);
  const keyPages = uniqueTitles(
    data.canonicalSurfaces
      .slice(0, 5)
      .map((surface) => surface.title),
  );
  const maintenanceSurfaces = uniqueTitles([
    data.maintenanceRhythmTitle,
    data.currentTensionsTitle,
    data.openQuestionsTitle,
    data.maintenanceWatchpointsTitle,
    data.archivedNoteTitle,
  ]);

  return [
    `# ${data.indexTitle}`,
    "",
    "## Overview",
    "",
    buildWikiOverviewText(data),
    "",
    "## Start here",
    "",
    formatLinkedList(startHereTitles),
    "",
    "## How to use this wiki",
    "",
    `- Read ${wikiLink(data.canonicalSurfaces[0]?.title ?? data.topicTitle)} first if you want the shortest durable explanation of the topic.`,
    `- Read ${wikiLink(data.currentTensionsTitle)} when you want the active trade-offs and live uncertainty, not just the neutral article layer.`,
    `- Read ${wikiLink(data.maintenanceRhythmTitle)} when you want the maintenance queue, context-pack refreshes, and next synthesis candidates.`,
    `- Read ${wikiLink(data.readingPathsTitle)} when you want a small note bundle for orientation, maintenance review, provenance tracing, or model loading.`,
    "",
    "## Key pages",
    "",
    ...keyPages.map((title) => {
      const surface = findKnowledgeSurface(data, title);
      return `- ${wikiLink(title)}: ${cleanSentenceFragment(
        surface?.purpose ?? "A durable entry in the compiled wiki",
      )}.`;
    }),
    "",
    "## Maintenance surfaces",
    "",
    ...maintenanceSurfaces.map((title) => {
      const surface = findKnowledgeSurface(data, title);
      return `- ${wikiLink(title)}: ${cleanSentenceFragment(
        surface?.purpose ?? "An active maintenance surface",
      )}.`;
    }),
    "",
    "## Open fronts",
    "",
    `- ${wikiLink(data.currentTensionsTitle)}`,
    `- ${wikiLink(data.openQuestionsTitle)}`,
    `- ${wikiLink(data.maintenanceRhythmTitle)}`,
    "",
    "## Open questions",
    "",
    ...data.openQuestions.map((question) => `- ${question}`),
    "",
    "## Corpus",
    "",
    ...data.corpusNotes.map((note) => `- ${note}`),
    "",
    "## Artifact ladder",
    "",
    ...data.artifactLadder.map((note) => `- ${note}`),
    "",
    "## Visible artifacts",
    "",
    `- ${wikiLink("Summary Atlas")} in the Obsidian projection and \`raw/processed/summaries/\` in the canonical workspace expose the summary layer.`,
    `- ${wikiLink("Review History")} and \`reviews/\` preserve the mutation gate.`,
    `- ${wikiLink("Audit Atlas")} and \`audits/\` expose the structural weakness layer.`,
    "",
    buildCanonicalVsWorkingSection(data),
    "",
    "## Reading path",
    "",
    `Read ${wikiLink(data.canonicalSurfaces[0]?.title ?? data.topicTitle)} first, then ${wikiLink(data.currentTensionsTitle)}, ${wikiLink(
      data.canonicalSurfaces[1]?.title ?? data.maintenanceWatchpointsTitle,
    )}, ${wikiLink(data.maintenanceWatchpointsTitle)}, and finally ${wikiLink(
      data.maintenanceRhythmTitle,
    )} if you want the next work rather than the current article state.`,
  ].join("\n");
}

function buildWikiReadingPathsPage(data: KnowledgeMethodTemplateData) {
  const sections = data.readingPasses.flatMap((pass) => [
    `## ${pass.title}`,
    "",
    pass.description,
    "",
    formatLinkedList(pass.steps, true),
    "",
  ]);
  const modelPackTitles = data.contextPacks.map((pack) => `\`${pack.title}\``).join(", ");

  return [
    `# ${data.readingPathsTitle}`,
    "",
    "## Overview",
    "",
    `This page organizes ${data.topicTitle} into small working bundles so a reader can load only the notes needed for orientation, maintenance review, provenance tracing, or model input.`,
    "",
    ...sections,
    "## Feed to the model",
    "",
    `- Start from ${wikiLink(data.canonicalSurfaces[0]?.title ?? data.topicTitle)} instead of raw sources.`,
    `- Use ${wikiLink(data.maintenanceRhythmTitle)} to decide which bundle is still current.`,
    `- In the Obsidian projection, prefer ${modelPackTitles} when you want a compact note set instead of the full article graph.`,
    "",
    "## Related pages",
    "",
    formatLinkedList([
      data.indexTitle,
      data.maintenanceRhythmTitle,
      data.openQuestionsTitle,
      data.maintenanceWatchpointsTitle,
    ]),
  ].join("\n");
}

function buildWikiCurrentTensionsPage(data: KnowledgeMethodTemplateData) {
  return [
    `# ${data.currentTensionsTitle}`,
    "",
    "## Summary",
    "",
    data.tensionsSummary,
    "",
    "## Current tensions",
    "",
    ...data.tensions.map((tension) => `- ${tension}`),
    "",
    "## Why they matter",
    "",
    ...data.tensionImportance.map((item) => `- ${item}`),
    "",
    "## What might become synthesis next",
    "",
    ...data.synthesisCandidates.map(
      (candidate) => `- **${candidate.title}**: ${candidate.whyNow}`,
    ),
    "",
    "## Related pages",
    "",
    formatLinkedList([
      data.canonicalSurfaces[0]?.title ?? data.topicTitle,
      data.maintenanceWatchpointsTitle,
      data.openQuestionsTitle,
      data.maintenanceRhythmTitle,
    ]),
  ].join("\n");
}

function buildWikiOpenQuestionsPage(data: KnowledgeMethodTemplateData) {
  const formatContextPack = (title: string) => `\`${title}\``;
  const reopenSection = buildQuestionReopenSection(data, formatContextPack);
  const sessionOutcomeSection = buildResearchSessionOutcomeSection(data, formatContextPack);
  const publishedSynthesisSection = buildPublishedSynthesisSection(data);
  const evidenceReopenSection = buildReopenedByEvidenceSection(data, formatContextPack);

  return [
    `# ${data.openQuestionsTitle}`,
    "",
    "## Summary",
    "",
    data.openQuestionsSummary,
    "",
    "## Questions",
    "",
    buildQuestionWorkflowBlocks(data, formatContextPack),
    "",
    "## What would resolve them",
    "",
    ...data.resolutionSignals.map((signal) => `- ${signal}`),
    "",
    "## What looks answerable next",
    "",
    ...data.synthesisCandidates.map(
      (candidate) =>
        `- **${candidate.title}** looks closest if you load ${candidate.load
          .map((title) => wikiLink(title))
          .join(", ")}.`,
    ),
    "",
    sessionOutcomeSection,
    "",
    publishedSynthesisSection,
    "",
    evidenceReopenSection,
    "",
    "## Related pages",
    "",
    formatLinkedList([
      data.canonicalSurfaces[0]?.title ?? data.topicTitle,
      data.currentTensionsTitle,
      data.maintenanceWatchpointsTitle,
      data.maintenanceRhythmTitle,
      data.archivedNoteTitle,
    ]),
    "",
    reopenSection,
  ].join("\n");
}

function buildWikiMaintenanceWatchpointsPage(data: KnowledgeMethodTemplateData) {
  const watchLines = uniqueTitles(
    data.monitoringSurfaces.map((surface) => surface.title).concat(
      data.canonicalSurfaces.slice(1, 4).map((surface) => surface.title),
    ),
  ).filter((title) => titleKey(title) !== titleKey(data.maintenanceWatchpointsTitle));

  return [
    `# ${data.maintenanceWatchpointsTitle}`,
    "",
    "## Thesis",
    "",
    `Maintaining ${data.topicTitle} well means tracking the durable article surfaces together with the operational watch surfaces instead of trusting any one page in isolation.`,
    "",
    "## Watchpoints",
    "",
    ...watchLines.map((title) => {
      const surface = findKnowledgeSurface(data, title);
      return `- ${wikiLink(title)}: ${surface?.purpose ?? "A maintenance surface."}`;
    }),
    "",
    "## Refresh triggers",
    "",
    ...data.contextPackRefreshes.map(
      (item) => `- ${item.title}: refresh when ${item.trigger}.`,
    ),
    "",
    "## Action path",
    "",
    `- Re-read ${wikiLink(data.currentTensionsTitle)} if a watchpoint changes the operating story.`,
    `- Update ${wikiLink(data.openQuestionsTitle)} when a watchpoint opens or closes a question.`,
    `- Update ${wikiLink(data.maintenanceRhythmTitle)} when a watchpoint should change revisit order or create a new synthesis candidate.`,
    "",
    "## Related pages",
    "",
    formatLinkedList([
      data.canonicalSurfaces[0]?.title ?? data.topicTitle,
      data.currentTensionsTitle,
      data.openQuestionsTitle,
      data.maintenanceRhythmTitle,
    ]),
  ].join("\n");
}

function buildWikiMaintenanceRhythmPage(data: KnowledgeMethodTemplateData) {
  const sessionQueueSection = buildResearchSessionQueueSection(data, (title) => `\`${title}\``);
  const synthesisDecisionSection = buildSynthesisDecisionSection(data);
  const evidenceChangeSection = buildEvidenceChangeSection(data);

  return [
    `# ${data.maintenanceRhythmTitle}`,
    "",
    "## Summary",
    "",
    buildMaintenanceRhythmSummary(data),
    "",
    "## Review cadence",
    "",
    `- Start a maintenance pass with ${wikiLink(data.currentTensionsTitle)} and ${wikiLink(
      data.openQuestionsTitle,
    )}.`,
    `- Re-open ${wikiLink(data.maintenanceWatchpointsTitle)} before any upgrade, policy, or integration decision.`,
    `- Refresh ${wikiLink(data.readingPathsTitle)} whenever the smallest useful note bundle changes.`,
    "",
    "## Revisit next",
    "",
    ...data.revisitQueue.map(
      (item) =>
        `- ${wikiLink(item.title)}: ${cleanSentenceFragment(item.why)}. Trigger: ${cleanSentenceFragment(
          item.trigger,
        )}.`,
    ),
    "",
    sessionQueueSection,
    "",
    synthesisDecisionSection,
    "",
    evidenceChangeSection,
    "",
    buildContextPackRefreshSection(data),
    "",
    buildSynthesisCandidateSection(data),
    "",
    buildAuditActionSection(data),
    "",
    buildCanonicalVsWorkingSection(data),
    "",
    "## Related pages",
    "",
    formatLinkedList([
      data.indexTitle,
      data.currentTensionsTitle,
      data.openQuestionsTitle,
      data.maintenanceWatchpointsTitle,
      data.readingPathsTitle,
    ]),
  ].join("\n");
}

function buildObsidianReadme(data: KnowledgeMethodTemplateData) {
  const contextPackTitles = data.contextPacks
    .map((pack) => `[[${pack.title}]]`)
    .join(", ");

  return `# ${data.topicTitle} Obsidian Vault

> [!info]
> ${buildObsidianProjectionIntro(data)}

## Start here

- [[Start Here]]
- [[Topic Map]]
- [[Key Pages]]
- [[Reading Paths]]
- [[Maintenance Rhythm]]
- [[LLM Context Pack]]
- [[Open Questions]]
- [[Current Tensions]]
- [[Monitoring]]
- [[Artifact Map]]

## Vault layout

- \`00 Atlas/\`: maps of content, reading routes, maintenance logic, and context-pack guidance.
- \`05 Context Packs/\`: compact note bundles for small human or model context windows.
- \`10 Articles/\`: the compiled wiki pages projected into Obsidian-friendly article notes.
${buildObsidianSourceFolderDescription(data)}
- \`25 Normalized Sources/\`: the processed source layer between raw excerpts and summaries.
- \`30 Summaries/\`: source summary notes that sit between raw materials and review proposals.
- \`40 Reviews/\`: approved and rejected patch proposals, kept visible as part of the mutation gate.
- \`50 Audits/\`: audit notes that highlight structural weaknesses or missing coverage.

## How to work inside Obsidian

- Pin [[Start Here]] and [[Maintenance Rhythm]] when using the vault as a daily working surface.
- Use [[Topic Map]], [[Current Tensions]], and [[Open Questions]] as the daily navigation trio.
- Use ${contextPackTitles} when you need a compact note bundle rather than the full article graph.
- Move from articles to normalized sources, summaries, reviews, and audits only when you need provenance or need to inspect how a claim was compiled.
`;
}

function buildObsidianStartHereNote(data: KnowledgeMethodTemplateData) {
  return `# Start Here

> [!summary]
> ${buildStartHereIntro(data)}

## What this vault is

${buildObsidianProjectionIdentity(data)}
- A calmer working surface for browsing the compiled wiki in Obsidian.
- A way to keep articles, source excerpts, normalized sources, summaries, proposals, audits, and maintenance loops one hop apart.

## Primary reading path

${formatLinkedList(
  uniqueTitles([
    data.canonicalSurfaces[0]?.title ?? data.topicTitle,
    data.currentTensionsTitle,
    data.canonicalSurfaces[1]?.title ?? "",
    data.canonicalSurfaces[2]?.title ?? "",
    data.canonicalSurfaces[3]?.title ?? "",
    data.maintenanceWatchpointsTitle,
    data.maintenanceRhythmTitle,
    data.openQuestionsTitle,
    data.archivedNoteTitle,
  ]),
)}

## Artifact ladder

${formatLinkedList(data.artifactSurfaces.map((surface) => surface.title))}

## Daily habits

- Keep [[Start Here]] pinned as your map of content.
- Open [[Maintenance Rhythm]] before deciding whether to reread the full article set.
- Use [[LLM Context Pack]] when you want a minimal, high-signal bundle of notes for analysis.
`;
}

function buildObsidianTopicMapNote(data: KnowledgeMethodTemplateData) {
  return `# Topic Map

## Canonical entries

${formatLinkedList(data.canonicalSurfaces.map((surface) => surface.title))}

## Working surfaces

${formatLinkedList(data.workingSurfaces.map((surface) => surface.title))}

## Monitoring surfaces

${formatLinkedList(data.monitoringSurfaces.map((surface) => surface.title))}

## Artifact surfaces

${formatLinkedList(data.artifactSurfaces.map((surface) => surface.title))}
`;
}

function buildObsidianKeyPagesNote(data: KnowledgeMethodTemplateData) {
  const operatingSurfaces = uniqueTitles([
    data.maintenanceWatchpointsTitle,
    data.maintenanceRhythmTitle,
    data.currentTensionsTitle,
    data.openQuestionsTitle,
    data.archivedNoteTitle,
  ])
    .map((title) => findKnowledgeSurface(data, title))
    .filter((surface): surface is KnowledgeSurfaceTemplate => surface !== null);

  return `# Key Pages

## Read these first

${formatSurfaceBullets(data.canonicalSurfaces.slice(0, 3))}

## Read these when operating

${formatSurfaceBullets(operatingSurfaces)}

## Read these when checking provenance

${formatSurfaceBullets(data.artifactSurfaces)}
`;
}

function buildObsidianReadingPathsNote(data: KnowledgeMethodTemplateData) {
  const sections = data.readingPasses.flatMap((pass) => [
    `## ${pass.title}`,
    "",
    pass.description,
    "",
    formatLinkedList(pass.steps, true),
    "",
  ]);

  return [`# Reading Paths`, "", ...sections].join("\n");
}

function buildObsidianOpenQuestionsNote(data: KnowledgeMethodTemplateData) {
  const reopenSection = buildQuestionReopenSection(data);
  const sessionOutcomeSection = buildResearchSessionOutcomeSection(data);
  const publishedSynthesisSection = buildPublishedSynthesisSection(data);
  const evidenceReopenSection = buildReopenedByEvidenceSection(data);

  return `# Open Questions

## Highest-leverage open questions

${buildQuestionWorkflowBlocks(data)}

## What would reduce uncertainty

${data.resolutionSignals.map((signal) => `- ${signal}`).join("\n")}

## What might become a synthesis next

${data.synthesisCandidates
  .map((candidate) => `- **${candidate.title}**: ${candidate.whyNow}`)
  .join("\n")}

${sessionOutcomeSection}

${publishedSynthesisSection}

${evidenceReopenSection}

${reopenSection ? `\n\n${reopenSection}` : ""}
`;
}

function buildObsidianCurrentTensionsNote(data: KnowledgeMethodTemplateData) {
  return `# Current Tensions

## Main tensions

${data.tensions.map((tension) => `- ${tension}`).join("\n")}

## Where to inspect them

${formatLinkedList(
  uniqueTitles([
    data.canonicalSurfaces[0]?.title ?? data.topicTitle,
    data.currentTensionsTitle,
    data.maintenanceWatchpointsTitle,
    data.maintenanceRhythmTitle,
  ]),
)}

## What should become synthesis next

${data.synthesisCandidates
  .map((candidate) => `- **${candidate.title}**`)
  .join("\n")}
`;
}

function buildObsidianMonitoringNote(data: KnowledgeMethodTemplateData) {
  return `# Monitoring

## What to monitor

${formatSurfaceBullets(data.monitoringSurfaces)}

## Refresh triggers

${data.contextPackRefreshes
  .map((item) => `- ${item.title}: refresh when ${item.trigger}.`)
  .join("\n")}

## Escalation path

- If a watch surface changes the operational story, reopen [[Current Tensions]].
- If it closes or opens a question, update [[Open Questions]].
- If it changes revisit order or suggests a new synthesis, update [[Maintenance Rhythm]].
`;
}

function buildObsidianMaintenanceRhythmNote(data: KnowledgeMethodTemplateData) {
  const sessionQueueSection = buildResearchSessionQueueSection(data);
  const synthesisDecisionSection = buildSynthesisDecisionSection(data);
  const evidenceChangeSection = buildEvidenceChangeSection(data);

  return `# Maintenance Rhythm

## Start a pass here

- Read [[Current Tensions]].
- Read [[Open Questions]].
- Read [[${data.maintenanceWatchpointsTitle}]].
- Only reopen the full article graph if these three notes say the story moved.

## Revisit next

${data.revisitQueue
  .map((item) => `- ${wikiLink(item.title)}: ${item.why}`)
  .join("\n")}

${sessionQueueSection}

${synthesisDecisionSection}

${evidenceChangeSection}

## Context packs to refresh

${data.contextPackRefreshes
  .map((item) => `- \`${item.title}\`: ${item.trigger}.`)
  .join("\n")}

## Synthesis candidates

${data.synthesisCandidates
  .map((candidate) => `- **${candidate.title}**: ${candidate.whyNow}`)
  .join("\n")}
`;
}

function buildObsidianLlmContextPackNote(data: KnowledgeMethodTemplateData) {
  return `# LLM Context Pack

> [!info]
> This vault is organized for small, deliberate context packs. The goal is to keep the active note set compact, grounded, and inspectable.

## Working principle

- Start from the compiled article notes, not the raw corpus.
- Pull in source notes only when a claim needs inspection.
- Add review or audit notes only when you need to understand how the wiki mutated or where it is weak.

## Available packs

${data.contextPacks.map((pack) => `- [[${pack.title}]]`).join("\n")}

## When to reopen the pack list

- Reopen this note after updating [[Maintenance Rhythm]].
- Reopen this note when a previously compact pack starts feeling too stale or too broad.
`;
}

function buildObsidianArtifactMapNote(data: KnowledgeMethodTemplateData) {
  return `# Artifact Map

## Read the compiled wiki first

${formatLinkedList(
  uniqueTitles([
    data.canonicalSurfaces[0]?.title ?? data.topicTitle,
    data.currentTensionsTitle,
    data.maintenanceWatchpointsTitle,
    data.maintenanceRhythmTitle,
    data.archivedNoteTitle,
  ]),
)}

## Then inspect the artifact trail

${formatLinkedList(data.artifactSurfaces.map((surface) => surface.title))}

## Where unresolved items should land

- If a question is still unresolved after provenance review, update [[Open Questions]].
- If the evidence changes maintenance order, update [[Maintenance Rhythm]].
- If the evidence deserves a durable article, turn it into a synthesis candidate first.
`;
}

function buildObsidianContextPackNote(pack: KnowledgeContextPackTemplate) {
  const lines = [
    `# ${pack.title}`,
    "",
    "## Use this pack when",
    "",
    `- ${pack.useWhen}`,
    "",
    "## Load these notes",
    "",
    ...pack.load.map((title) => `- ${wikiLink(title)}`),
  ];

  if (pack.optional && pack.optional.length > 0) {
    lines.push("", "## Optional deepening", "", ...pack.optional.map((title) => `- ${wikiLink(title)}`));
  }

  if (pack.keepActive && pack.keepActive.length > 0) {
    lines.push(
      "",
      "## Questions to keep active",
      "",
      ...pack.keepActive.map((question) => `- ${question}`),
    );
  }

  if (pack.walkOrder && pack.walkOrder.length > 0) {
    lines.push("", "## Walk order", "", ...pack.walkOrder.map((step, index) => `${index + 1}. ${step}`));
  }

  return `${lines.join("\n")}\n`;
}

export function buildKnowledgeMethodPack(
  data: KnowledgeMethodTemplateData,
): KnowledgeMethodPack {
  const obsidianAtlas: Record<string, string> = {
    "Start Here": buildObsidianStartHereNote(data),
    "Topic Map": buildObsidianTopicMapNote(data),
    "Key Pages": buildObsidianKeyPagesNote(data),
    "Reading Paths": buildObsidianReadingPathsNote(data),
    "Open Questions": buildObsidianOpenQuestionsNote(data),
    "Current Tensions": buildObsidianCurrentTensionsNote(data),
    Monitoring: buildObsidianMonitoringNote(data),
    "Maintenance Rhythm": buildObsidianMaintenanceRhythmNote(data),
    "LLM Context Pack": buildObsidianLlmContextPackNote(data),
    "Artifact Map": buildObsidianArtifactMapNote(data),
  };

  const obsidianContextPacks = Object.fromEntries(
    data.contextPacks.map((pack) => [pack.title, buildObsidianContextPackNote(pack)]),
  );

  return {
    wiki: {
      index: buildWikiIndexPage(data),
      readingPaths: buildWikiReadingPathsPage(data),
      currentTensions: buildWikiCurrentTensionsPage(data),
      openQuestions: buildWikiOpenQuestionsPage(data),
      maintenanceWatchpoints: buildWikiMaintenanceWatchpointsPage(data),
      maintenanceRhythm: buildWikiMaintenanceRhythmPage(data),
    },
    obsidian: {
      readme: buildObsidianReadme(data),
      atlas: obsidianAtlas,
      contextPacks: obsidianContextPacks,
    },
  };
}
