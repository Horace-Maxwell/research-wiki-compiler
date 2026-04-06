import type { KnowledgeMethodTemplateData } from "@/server/services/knowledge-method-template-service";

export const openClawKnowledgeMethodData: KnowledgeMethodTemplateData = {
  topicTitle: "OpenClaw",
  indexTitle: "OpenClaw Example Index",
  readingPathsTitle: "OpenClaw reading paths",
  currentTensionsTitle: "OpenClaw current tensions",
  openQuestionsTitle: "OpenClaw open questions",
  maintenanceWatchpointsTitle: "OpenClaw maintenance watchpoints",
  maintenanceRhythmTitle: "OpenClaw maintenance rhythm",
  archivedNoteTitle: "Note: What should I monitor before upgrading OpenClaw",
  canonicalSurfaces: [
    {
      title: "OpenClaw",
      purpose: "The core entity page and shortest durable statement of what the corpus says the project is.",
      role: "The canonical entry point for the topic.",
      surfaceKind: "canonical",
      revisitCadence: "Refresh when the corpus changes the main story of the project.",
      refreshTriggers: [
        "A new source changes the main description of OpenClaw.",
        "A tension or monitoring page changes the top-level framing.",
      ],
    },
    {
      title: "OpenClaw release cadence",
      purpose: "A topic page that frames release speed as an upgrade-planning signal.",
      role: "The canonical release and upgrade checkpoint page.",
      surfaceKind: "canonical",
      revisitCadence: "Refresh on each notable release signal or changelog packaging change.",
      refreshTriggers: [
        "A release note changes regression expectations.",
        "Changelog packaging becomes a stronger upgrade signal.",
      ],
    },
    {
      title: "Plugin compatibility",
      purpose: "A concept page that tracks plugin and SDK-surface stability.",
      role: "The canonical integration-boundary page.",
      surfaceKind: "canonical",
      revisitCadence: "Refresh when plugin APIs, SDK baselines, or integration assumptions move.",
      refreshTriggers: [
        "SDK baseline updates land.",
        "Integration or plugin assumptions begin to drift.",
      ],
    },
    {
      title: "Provider dependency risk",
      purpose: "A concept page for provider-side constraints and external dependency risk.",
      role: "The canonical external-dependency page.",
      surfaceKind: "canonical",
      revisitCadence: "Refresh when provider policy, access, or workflow dependency shifts.",
      refreshTriggers: [
        "Provider policy changes affect access assumptions.",
        "Workflow behavior starts depending on a provider-side change.",
      ],
    },
    {
      title: "OpenClaw maintenance watchpoints",
      purpose: "A synthesis that turns the canonical pages into an operator-facing monitoring surface.",
      role: "The operational synthesis for maintainers.",
      surfaceKind: "canonical",
      revisitCadence: "Refresh when any watch surface changes enough to alter upgrade posture.",
      refreshTriggers: [
        "Release speed changes maintenance depth.",
        "Plugin compatibility or provider risk changes operational decisions.",
      ],
    },
  ],
  workingSurfaces: [
    {
      title: "OpenClaw current tensions",
      purpose: "A synthesis that keeps active trade-offs visible instead of hiding them inside neutral articles.",
      role: "The live-uncertainty surface.",
      surfaceKind: "working",
      revisitCadence: "Refresh whenever a new signal changes practical risk or strategic ambiguity.",
      refreshTriggers: [
        "A release or provider signal changes the risk story.",
        "A rejected proposal keeps recurring in review history.",
      ],
    },
    {
      title: "OpenClaw open questions",
      purpose: "A working note for unresolved questions that should drive the next reading pass.",
      role: "The unresolved-work queue.",
      surfaceKind: "working",
      revisitCadence: "Refresh after every new source batch or audit pass.",
      refreshTriggers: [
        "New evidence lands.",
        "A question becomes answerable enough to promote into synthesis.",
      ],
    },
    {
      title: "OpenClaw maintenance rhythm",
      purpose: "A maintenance map that decides revisit order, context-pack refreshes, and synthesis candidates.",
      role: "The daily maintenance control surface.",
      surfaceKind: "working",
      revisitCadence: "Review at the start of each maintenance pass.",
      refreshTriggers: [
        "A context pack goes stale.",
        "An audit finding or watchpoint changes next work.",
      ],
    },
    {
      title: "OpenClaw reading paths",
      purpose: "A synthesis that organizes the smallest useful note bundles for orientation, maintenance, provenance, and resume flows.",
      role: "The bundle-selection guide.",
      surfaceKind: "working",
      revisitCadence: "Refresh whenever the smallest useful bundle changes.",
      refreshTriggers: [
        "A new working surface becomes essential.",
        "The recommended model-loading bundle changes.",
      ],
    },
  ],
  monitoringSurfaces: [
    {
      title: "OpenClaw maintenance watchpoints",
      purpose: "The main monitoring synthesis for upgrades and maintenance.",
      role: "The primary monitoring note.",
      surfaceKind: "monitoring",
      revisitCadence: "Refresh when release, provider, or integration signals move.",
      refreshTriggers: [
        "Upgrade posture changes.",
        "A watchpoint needs escalation into tensions or open questions.",
      ],
    },
    {
      title: "Note: What should I monitor before upgrading OpenClaw",
      purpose: "An archived grounded answer that remains useful as an operational checklist.",
      role: "A working operational note that feeds the maintenance loop.",
      surfaceKind: "monitoring",
      revisitCadence: "Refresh when a better grounded answer becomes available.",
      refreshTriggers: [
        "The compiled pages can now answer the question more directly.",
        "A monitoring assumption becomes stale.",
      ],
    },
  ],
  artifactSurfaces: [
    {
      title: "Corpus Atlas",
      purpose: "The bounded source intake surface.",
      role: "The raw source entry layer.",
      surfaceKind: "artifact",
    },
    {
      title: "Processed Source Atlas",
      purpose: "The normalized source bridge between raw corpus and summaries.",
      role: "The cleaned-source layer.",
      surfaceKind: "artifact",
    },
    {
      title: "Summary Atlas",
      purpose: "The summary layer that exposes what the summarizer extracted before planning patches.",
      role: "The source-to-claim bridge.",
      surfaceKind: "artifact",
    },
    {
      title: "Review History",
      purpose: "The proposal/review layer that preserves how the wiki mutated.",
      role: "The mutation-gate history.",
      surfaceKind: "artifact",
    },
    {
      title: "Audit Atlas",
      purpose: "The audit layer that exposes structural weakness and freshness gaps.",
      role: "The maintenance-diagnostic layer.",
      surfaceKind: "artifact",
    },
  ],
  readingPasses: [
    {
      title: "Orientation pass",
      description: "Use this when you want the shortest durable statement of the topic and its active risks.",
      steps: [
        "OpenClaw",
        "OpenClaw current tensions",
        "OpenClaw maintenance watchpoints",
      ],
    },
    {
      title: "Maintenance pass",
      description: "Use this when deciding whether the example needs operational refresh.",
      steps: [
        "OpenClaw maintenance rhythm",
        "OpenClaw release cadence",
        "Plugin compatibility",
        "Provider dependency risk",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
    },
    {
      title: "Provenance pass",
      description: "Use this when you need to inspect how the compiled story was assembled.",
      steps: [
        "OpenClaw",
        "Processed Source Atlas",
        "Summary Atlas",
        "Review History",
        "Audit Atlas",
      ],
    },
    {
      title: "Resume without rereading everything",
      description: "Use this when you are returning to the topic after time away.",
      steps: [
        "OpenClaw maintenance rhythm",
        "OpenClaw current tensions",
        "OpenClaw open questions",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
    },
  ],
  tensionsSummary:
    "The most important tension in this corpus is that OpenClaw looks useful precisely where it is still moving: releases are frequent, plugin surfaces are changing, and provider-side constraints remain outside the project's direct control.",
  tensions: [
    "Release speed versus local workflow stability.",
    "Plugin-surface progress versus integration breakage risk.",
    "Provider leverage versus durable access assumptions.",
  ],
  tensionImportance: [
    "A maintainer can read release notes and still miss workflow drift if they do not also inspect compatibility and provider assumptions.",
    "The same fast motion that makes the project interesting also makes upgrade timing and regression depth more important.",
    "If a tension keeps recurring, it should leave the article layer and become an explicit maintenance or synthesis surface.",
  ],
  openQuestionsSummary:
    "These are the highest-leverage unresolved questions if you want to keep the OpenClaw example current or use it as a durable operational case study.",
  openQuestions: [
    "Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?",
    "Which plugin or SDK assumptions are most likely to drift between releases?",
    "Which provider-side changes would change adoption or upgrade decisions the fastest?",
  ],
  researchQuestions: [
    {
      id: "define-openclaw-in-corpus",
      question: "What is OpenClaw in this corpus?",
      summary:
        "The core identity question is already grounded well enough that the canonical entry page can carry it, rather than leaving it as a floating working note.",
      status: "synthesized",
      priority: "high",
      whyNow:
        "This question is the anchor for every later maintenance, risk, and comparison question in the topic.",
      contextPackTitle: "Explain OpenClaw",
      supportingContextPackTitles: ["Provenance And Review"],
      relatedPages: ["OpenClaw", "OpenClaw current tensions", "OpenClaw release cadence"],
      relatedTensions: ["Release speed versus local workflow stability."],
      relatedWatchpoints: [],
      evidenceToAdvance: [],
      sourceGaps: [],
      synthesizeInto: null,
      canonicalTargetTitle: "OpenClaw",
      reopenTriggers: [
        "A new source changes the main description of the project.",
        "The maintenance surfaces force a different top-level framing of what OpenClaw is.",
      ],
      provenanceNotes: [
        "The canonical entity page now holds the strongest durable answer.",
        "Use Provenance And Review if the identity story needs to be re-grounded from artifacts.",
      ],
    },
    {
      id: "unstable-surfaces",
      question: "Which parts of OpenClaw look most unstable or fast-moving?",
      summary:
        "The question is already answerable through the tensions and monitoring syntheses, so it should stay grounded there unless the operating story changes again.",
      status: "synthesized",
      priority: "medium",
      whyNow:
        "This remains the quickest way to reopen the topic when release cadence, provider risk, or compatibility assumptions move.",
      contextPackTitle: "Maintenance Triage",
      supportingContextPackTitles: ["Explain OpenClaw"],
      relatedPages: [
        "OpenClaw current tensions",
        "OpenClaw maintenance watchpoints",
        "OpenClaw release cadence",
      ],
      relatedTensions: [
        "Release speed versus local workflow stability.",
        "Plugin-surface progress versus integration breakage risk.",
        "Provider leverage versus durable access assumptions.",
      ],
      relatedWatchpoints: ["OpenClaw maintenance watchpoints"],
      evidenceToAdvance: [],
      sourceGaps: [],
      synthesizeInto: null,
      canonicalTargetTitle: "OpenClaw current tensions",
      reopenTriggers: [
        "A release note or provider signal changes what looks operationally unstable.",
        "The watchpoint page starts recommending a different maintenance posture.",
      ],
      provenanceNotes: [
        "Use the tensions synthesis first, then check monitoring for the operator-facing version.",
      ],
    },
    {
      id: "monitor-before-upgrade",
      question: "What should I monitor before upgrading OpenClaw?",
      summary:
        "This question already has a grounded archived note, but it should reopen whenever the upgrade posture or provider-risk story changes.",
      status: "synthesized",
      priority: "high",
      whyNow:
        "It is the most reusable operational question in the example and the clearest bridge between Ask, archive, and maintenance work.",
      contextPackTitle: "Upgrade Watchpoints",
      supportingContextPackTitles: ["Maintenance Triage"],
      relatedPages: [
        "OpenClaw maintenance watchpoints",
        "Note: What should I monitor before upgrading OpenClaw",
        "Provider dependency risk",
        "OpenClaw release cadence",
      ],
      relatedTensions: ["Release speed versus local workflow stability."],
      relatedWatchpoints: ["OpenClaw maintenance watchpoints"],
      evidenceToAdvance: [],
      sourceGaps: [],
      synthesizeInto: null,
      canonicalTargetTitle: "Note: What should I monitor before upgrading OpenClaw",
      reopenTriggers: [
        "Release notes begin signaling different regression depth.",
        "Provider-side policy or access changes alter upgrade posture.",
        "Plugin compatibility drift makes the archived checklist incomplete.",
      ],
      provenanceNotes: [
        "This question is grounded by the archived note plus the watchpoints synthesis.",
      ],
    },
    {
      id: "upgrade-regression-triggers",
      question:
        "Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?",
      summary:
        "This question is closest to durable synthesis because the release page, monitoring page, archived note, and open-question surface already carry most of the practical rule set.",
      status: "ready-for-synthesis",
      priority: "high",
      whyNow:
        "It is the highest-leverage next synthesis because it would turn repeated upgrade-reading work into a reusable operator-facing page.",
      contextPackTitle: "Upgrade Watchpoints",
      supportingContextPackTitles: ["Maintenance Triage"],
      relatedPages: [
        "OpenClaw release cadence",
        "OpenClaw maintenance watchpoints",
        "OpenClaw open questions",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
      relatedTensions: ["Release speed versus local workflow stability."],
      relatedWatchpoints: ["OpenClaw maintenance watchpoints"],
      evidenceToAdvance: [
        "Release notes keep mapping shipped fixes to workflow-facing regression depth.",
      ],
      sourceGaps: [],
      synthesizeInto: "OpenClaw upgrade regression triggers",
      canonicalTargetTitle: null,
      reopenTriggers: [
        "Release packaging changes and invalidates the current trigger logic.",
      ],
      provenanceNotes: [
        "The archived upgrade note already gives the operational bridge into this synthesis.",
      ],
    },
    {
      id: "plugin-sdk-drift",
      question: "Which plugin or SDK assumptions are most likely to drift between releases?",
      summary:
        "The topic clearly exposes a compatibility boundary, but it still lacks enough longitudinal evidence to harden the drift story into a durable answer.",
      status: "waiting-for-sources",
      priority: "high",
      whyNow:
        "This is the thinnest high-value question left in the topic and the most likely source of avoidable integration surprise.",
      contextPackTitle: "Upgrade Watchpoints",
      supportingContextPackTitles: ["Provenance And Review"],
      relatedPages: [
        "Plugin compatibility",
        "OpenClaw open questions",
        "Review History",
        "Summary Atlas",
      ],
      relatedTensions: ["Plugin-surface progress versus integration breakage risk."],
      relatedWatchpoints: ["OpenClaw maintenance watchpoints"],
      evidenceToAdvance: [
        "Additional source excerpts that show how plugin API or SDK boundaries evolve over multiple releases.",
      ],
      sourceGaps: [
        "The corpus needs more release-to-release evidence about concrete plugin or SDK drift.",
      ],
      synthesizeInto: null,
      canonicalTargetTitle: null,
      reopenTriggers: [
        "A new release or changelog starts naming compatibility breakpoints directly.",
      ],
      provenanceNotes: [
        "Start from Plugin compatibility, then audit summaries and review history for repeated drift signals.",
      ],
    },
    {
      id: "provider-exposure-map",
      question: "Which provider-side changes would change adoption or upgrade decisions the fastest?",
      summary:
        "Provider exposure is already visible across the risk page, tensions page, and monitoring note, but it still wants a cleaner single synthesis.",
      status: "ready-for-synthesis",
      priority: "medium",
      whyNow:
        "This question is close enough to synthesis that one more focused pass could turn scattered provider-risk observations into a durable operating map.",
      contextPackTitle: "Upgrade Watchpoints",
      supportingContextPackTitles: ["Maintenance Triage"],
      relatedPages: [
        "Provider dependency risk",
        "OpenClaw current tensions",
        "OpenClaw maintenance watchpoints",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
      relatedTensions: ["Provider leverage versus durable access assumptions."],
      relatedWatchpoints: ["OpenClaw maintenance watchpoints"],
      evidenceToAdvance: [
        "Stronger evidence about how provider restrictions show up in actual workflow outcomes, not just community chatter.",
      ],
      sourceGaps: [
        "The corpus still needs one cleaner pass that ties provider events directly to operator decisions.",
      ],
      synthesizeInto: "OpenClaw provider exposure map",
      canonicalTargetTitle: null,
      reopenTriggers: [
        "A provider-side restriction or policy shift changes adoption assumptions materially.",
      ],
      provenanceNotes: [
        "Use Provider dependency risk with the monitoring synthesis to keep this question grounded in operational consequences.",
      ],
    },
  ],
  resolutionSignals: [
    "More explicit release notes that connect shipped fixes to workflow-facing breakpoints.",
    "Additional source excerpts that show how plugin API or SDK boundaries evolve over multiple releases.",
    "Stronger evidence about how provider restrictions show up in actual workflow outcomes, not just community chatter.",
  ],
  revisitQueue: [
    {
      title: "OpenClaw current tensions",
      why: "This is the fastest way to see whether the operating story actually changed.",
      trigger: "After any new release, provider, or plugin-surface signal.",
    },
    {
      title: "OpenClaw maintenance watchpoints",
      why: "This is the operational checklist that most directly affects upgrade behavior.",
      trigger: "Before upgrading or after any evidence that changes risk posture.",
    },
    {
      title: "OpenClaw open questions",
      why: "This is where unresolved work should stay visible instead of dissolving into backlog noise.",
      trigger: "After every new source batch, audit run, or rejected proposal with recurring rationale.",
    },
    {
      title: "OpenClaw reading paths",
      why: "This is where the smallest useful note bundle stays current.",
      trigger: "When the recommended order for readers or models changes.",
    },
  ],
  contextPackRefreshes: [
    {
      title: "Explain OpenClaw",
      trigger: "the core explanation or tension framing changes",
      load: ["OpenClaw", "OpenClaw current tensions", "OpenClaw release cadence"],
    },
    {
      title: "Upgrade Watchpoints",
      trigger: "upgrade posture or monitoring logic changes",
      load: [
        "OpenClaw maintenance watchpoints",
        "Note: What should I monitor before upgrading OpenClaw",
        "Provider dependency risk",
      ],
    },
    {
      title: "Provenance And Review",
      trigger: "you need to audit how a claim entered the wiki",
      load: ["OpenClaw", "Processed Source Atlas", "Summary Atlas", "Review History"],
    },
    {
      title: "Maintenance Triage",
      trigger: "you want to resume work without reloading the whole graph",
      load: [
        "OpenClaw maintenance rhythm",
        "OpenClaw current tensions",
        "OpenClaw open questions",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
    },
  ],
  synthesisCandidates: [
    {
      title: "OpenClaw upgrade regression triggers",
      whyNow:
        "Release cadence, monitoring, and open-question surfaces already suggest this synthesis, but the rule set is not yet durable enough to stand alone.",
      load: [
        "OpenClaw release cadence",
        "OpenClaw maintenance watchpoints",
        "OpenClaw open questions",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
    },
    {
      title: "OpenClaw provider exposure map",
      whyNow:
        "Provider risk is visible, but the practical workflow consequences are still split across a concept page, a tension page, and an operational note.",
      load: [
        "Provider dependency risk",
        "OpenClaw current tensions",
        "OpenClaw maintenance watchpoints",
      ],
    },
  ],
  auditActions: [
    {
      signal: "A coverage audit flags a thin or under-linked area.",
      nextSurface: "OpenClaw maintenance rhythm",
      action:
        "decide whether the gap belongs in the revisit queue, the open-question note, or a new synthesis candidate.",
    },
    {
      signal: "A rejected proposal contains a recurring concern that keeps coming back.",
      nextSurface: "OpenClaw current tensions",
      action:
        "promote the disagreement into a durable tension or question instead of letting it disappear in review history.",
    },
    {
      signal: "A monitoring assumption becomes stale after new source intake.",
      nextSurface: "OpenClaw maintenance watchpoints",
      action:
        "rewrite the watch surface first, then update the archived monitoring note only if the grounded answer changed.",
    },
  ],
  contextPacks: [
    {
      title: "Explain OpenClaw",
      useWhen: "you want the smallest durable bundle that explains what OpenClaw is in this corpus",
      load: [
        "OpenClaw",
        "OpenClaw current tensions",
        "OpenClaw release cadence",
      ],
      optional: ["Plugin compatibility", "OpenClaw maintenance watchpoints"],
    },
    {
      title: "Upgrade Watchpoints",
      useWhen: "you want the smallest operational bundle for deciding what to monitor before upgrading",
      load: [
        "OpenClaw maintenance watchpoints",
        "Note: What should I monitor before upgrading OpenClaw",
        "Provider dependency risk",
        "OpenClaw release cadence",
      ],
      keepActive: [
        "Which release signals imply a full regression run?",
        "Which provider assumptions are changing fastest?",
        "Which compatibility signals would make this upgrade non-routine?",
      ],
    },
    {
      title: "Provenance And Review",
      useWhen: "you want to inspect how the compiled wiki was built instead of only reading the final pages",
      load: [
        "OpenClaw",
        "Processed Source Atlas",
        "Summary Atlas",
        "Review History",
        "Audit Atlas",
      ],
      walkOrder: [
        "Start at [[OpenClaw]].",
        "Drop to [[Processed Source Atlas]] and [[Summary Atlas]].",
        "Inspect [[Review History]].",
        "Finish at [[Audit Atlas]].",
      ],
    },
    {
      title: "Maintenance Triage",
      useWhen: "you want to resume work quickly and decide what deserves attention before rereading the full topic",
      load: [
        "OpenClaw maintenance rhythm",
        "OpenClaw current tensions",
        "OpenClaw open questions",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
      optional: ["OpenClaw maintenance watchpoints", "Review History"],
      keepActive: [
        "What changed recently enough to alter maintenance order?",
        "Which context pack is now stale?",
        "Which open question is close enough to promote into synthesis?",
      ],
    },
  ],
  corpusNotes: [
    "Four curated excerpts from the user's Obsidian AI news digests between 2026-03-26 and 2026-04-05.",
    "The corpus emphasizes releases, plugin/API baseline changes, provider-facing refactors, and external provider-policy risk signals.",
    "The bounded corpus is intentionally small enough to support compact working bundles without losing provenance.",
  ],
  artifactLadder: [
    "Source excerpts enter through `source-corpus/` and `raw/processed/`.",
    "Normalized sources keep the cleaned-source layer visible before summary generation.",
    "Source summaries expose the first abstraction layer under `raw/processed/summaries/`.",
    "Review proposals preserve the mutation gate under `reviews/approved/` and `reviews/rejected/`.",
    "Durable compiled pages remain in `wiki/` and stay the source of truth.",
    "The archived note and coverage audit show how ask/archive/audit re-enter the knowledge base.",
  ],
};
