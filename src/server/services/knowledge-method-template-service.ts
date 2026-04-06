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
  return [
    `# ${data.openQuestionsTitle}`,
    "",
    "## Summary",
    "",
    data.openQuestionsSummary,
    "",
    "## Questions",
    "",
    ...data.openQuestions.map((question) => `- ${question}`),
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
    "## Related pages",
    "",
    formatLinkedList([
      data.canonicalSurfaces[0]?.title ?? data.topicTitle,
      data.currentTensionsTitle,
      data.maintenanceWatchpointsTitle,
      data.maintenanceRhythmTitle,
      data.archivedNoteTitle,
    ]),
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
  return `# Open Questions

## Highest-leverage open questions

${data.openQuestions.map((question) => `- ${question}`).join("\n")}

## What would reduce uncertainty

${data.resolutionSignals.map((signal) => `- ${signal}`).join("\n")}

## What might become a synthesis next

${data.synthesisCandidates
  .map((candidate) => `- **${candidate.title}**: ${candidate.whyNow}`)
  .join("\n")}
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
