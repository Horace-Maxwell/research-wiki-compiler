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
  researchSessions: [
    {
      id: "session-openclaw-identity",
      questionId: "define-openclaw-in-corpus",
      title: "Ground the OpenClaw entity page",
      goal: "Turn the core identity question into a durable canonical page instead of leaving it as a floating working note.",
      summary:
        "This completed grounding pass tightened the main OpenClaw entry, linked it to the tensions and release-cadence pages, and moved the identity question into the synthesized state.",
      status: "completed",
      priority: "high",
      sessionDate: "2026-04-01T16:00:00.000Z",
      loadedContextPackTitles: ["Explain OpenClaw"],
      supportingContextPackTitles: ["Provenance And Review"],
      relevantPages: ["OpenClaw", "OpenClaw current tensions", "OpenClaw release cadence"],
      relevantSources: [
        "2026-03-31 release and plugin surface digest",
        "2026-03-26 plugin SDK and policy digest",
      ],
      draftConclusion:
        "The corpus supports a stable top-level entity page for OpenClaw as long as faster-moving risk and upgrade detail stay in the working and monitoring surfaces.",
      evidenceGained: [
        "The bounded corpus repeats the same core story about OpenClaw's release motion and integration surface.",
        "The tensions page carries the uncertainty better than the entity page would.",
      ],
      remainingUncertainty: [
        "The identity story should reopen if provider risk or upgrade posture changes the main framing materially.",
      ],
      recommendedNextStep:
        "Keep the entity page stable, then use monitoring and tensions to decide when the identity framing actually needs to change.",
      outcome: "updated-canonical",
      synthesisTitle: null,
      archiveTitle: null,
      canonicalUpdateTitle: "OpenClaw",
      maintenanceUpdateTitles: ["OpenClaw open questions", "OpenClaw maintenance rhythm"],
      questionStatusChange: {
        from: "active",
        to: "synthesized",
        reason:
          "The canonical entity page now carries the strongest durable answer, so the identity question should drive reopen logic rather than stay in the active queue.",
      },
      resumeNotes: [
        "Reopen this grounding pass only if new corpus material changes the top-level description of the project.",
      ],
    },
    {
      id: "session-unstable-surfaces",
      questionId: "unstable-surfaces",
      title: "Map the unstable surfaces",
      goal: "Decide which fast-moving parts of OpenClaw deserve durable tension and watchpoint treatment.",
      summary:
        "This completed session compiled the release, provider, and plugin drift story into the tensions and maintenance-watchpoints syntheses, making the instability question resumable without reopening all artifacts.",
      status: "completed",
      priority: "medium",
      sessionDate: "2026-04-03T18:00:00.000Z",
      loadedContextPackTitles: ["Maintenance Triage"],
      supportingContextPackTitles: ["Explain OpenClaw"],
      relevantPages: [
        "OpenClaw current tensions",
        "OpenClaw maintenance watchpoints",
        "OpenClaw release cadence",
      ],
      relevantSources: [
        "2026-04-02 release cadence and test churn digest",
        "2026-04-05 provider risk and changelog digest",
      ],
      draftConclusion:
        "The instability story is durable enough to live in tensions and maintenance watchpoints, with release cadence, plugin compatibility, and provider exposure acting as the main operator-facing risk surfaces.",
      evidenceGained: [
        "Release cadence and compatibility drift recur across more than one source.",
        "Provider-side signals change the maintenance story rather than staying as background chatter.",
      ],
      remainingUncertainty: [
        "The provider exposure thread still wants a cleaner standalone synthesis when more direct evidence arrives.",
      ],
      recommendedNextStep:
        "Use the watchpoints page as the compact operator view, then decide whether provider exposure should become its own synthesis next.",
      outcome: "updated-working-note",
      synthesisTitle: "OpenClaw current tensions",
      archiveTitle: null,
      canonicalUpdateTitle: "OpenClaw maintenance watchpoints",
      maintenanceUpdateTitles: ["OpenClaw current tensions", "OpenClaw maintenance rhythm"],
      questionStatusChange: {
        from: "active",
        to: "synthesized",
        reason:
          "The instability answer now lives durably in the tensions and monitoring syntheses, so the question should reopen only if those operating surfaces change.",
      },
      resumeNotes: [
        "If release notes or provider events shift the operating story, reopen this question before changing the watchpoints synthesis.",
      ],
    },
    {
      id: "session-upgrade-monitoring-note",
      questionId: "monitor-before-upgrade",
      title: "Archive the upgrade monitoring answer",
      goal: "Turn the most reusable operational question into a grounded archived note linked back into maintenance.",
      summary:
        "This completed session bridged Ask, archive, and maintenance by turning the upgrade-monitoring question into a durable note that still points back to watchpoints and reopen triggers.",
      status: "completed",
      priority: "high",
      sessionDate: "2026-04-04T20:00:00.000Z",
      loadedContextPackTitles: ["Upgrade Watchpoints"],
      supportingContextPackTitles: ["Maintenance Triage"],
      relevantPages: [
        "OpenClaw maintenance watchpoints",
        "Note: What should I monitor before upgrading OpenClaw",
        "Provider dependency risk",
      ],
      relevantSources: [
        "2026-04-05 provider risk and changelog digest",
        "2026-04-02 release cadence and test churn digest",
      ],
      draftConclusion:
        "The upgrade question is best carried as a grounded archived note plus the watchpoints synthesis, with clear triggers for reopening when posture changes.",
      evidenceGained: [
        "The operator-facing checklist is already stable enough to survive as a durable note.",
        "The same monitoring logic can be reused across later upgrade passes.",
      ],
      remainingUncertainty: [
        "The archived note should reopen if provider or compatibility drift changes the checklist materially.",
      ],
      recommendedNextStep:
        "Keep the archived note short and grounded, then feed any recurring changes back into maintenance watchpoints first.",
      outcome: "archived-answer",
      synthesisTitle: null,
      archiveTitle: "Note: What should I monitor before upgrading OpenClaw",
      canonicalUpdateTitle: null,
      maintenanceUpdateTitles: ["OpenClaw maintenance watchpoints", "OpenClaw open questions"],
      questionStatusChange: {
        from: "ready-for-synthesis",
        to: "synthesized",
        reason:
          "The answer now has a durable archived form and should only re-enter the active queue when upgrade posture changes.",
      },
      resumeNotes: [
        "If the archived checklist and maintenance watchpoints start diverging, reopen this question before editing the note in isolation.",
      ],
    },
    {
      id: "session-upgrade-regression-triggers",
      questionId: "upgrade-regression-triggers",
      title: "Promote upgrade regression triggers into synthesis",
      goal: "Decide which release-note and changelog signals justify a full regression run instead of a light upgrade check.",
      summary:
        "This active session is the current highest-leverage synthesis pass because the release page, watchpoints, archived note, and open-question page already contain most of the rule set.",
      status: "active",
      priority: "high",
      sessionDate: "2026-04-05T19:10:00.000Z",
      loadedContextPackTitles: ["Upgrade Watchpoints"],
      supportingContextPackTitles: ["Maintenance Triage"],
      relevantPages: [
        "OpenClaw release cadence",
        "OpenClaw maintenance watchpoints",
        "OpenClaw open questions",
        "Note: What should I monitor before upgrading OpenClaw",
      ],
      relevantSources: ["2026-04-02 release cadence and test churn digest"],
      draftConclusion:
        "The strongest next durable page is likely a trigger map that separates light upgrade checks from full regression runs based on release and changelog signals.",
      evidenceGained: [
        "The current wiki already names the same upgrade triggers across more than one working surface.",
      ],
      remainingUncertainty: [
        "The rule set still needs one tighter pass so it reads as durable operator guidance rather than a bundle of adjacent notes.",
      ],
      recommendedNextStep:
        "Finish the trigger matrix, then update the question queue and maintenance rhythm together so the promotion is visible everywhere.",
      outcome: null,
      synthesisTitle: "OpenClaw upgrade regression triggers",
      archiveTitle: null,
      canonicalUpdateTitle: null,
      maintenanceUpdateTitles: ["OpenClaw maintenance rhythm", "OpenClaw open questions"],
      questionStatusChange: null,
      resumeNotes: [
        "Start from Upgrade Watchpoints, not the whole article graph.",
        "If the rule set still feels fuzzy, keep this as an active session instead of forcing synthesis.",
      ],
    },
    {
      id: "session-provider-exposure-map",
      questionId: "provider-exposure-map",
      title: "Tighten the provider exposure map",
      goal: "Decide whether provider-side changes now have enough operational evidence to become a standalone synthesis.",
      summary:
        "This queued session is close to synthesis, but it still wants one cleaner pass that ties provider events directly to adoption and upgrade decisions.",
      status: "queued",
      priority: "medium",
      sessionDate: "2026-04-06T16:00:00.000Z",
      loadedContextPackTitles: ["Upgrade Watchpoints"],
      supportingContextPackTitles: ["Maintenance Triage"],
      relevantPages: [
        "Provider dependency risk",
        "OpenClaw current tensions",
        "OpenClaw maintenance watchpoints",
      ],
      relevantSources: ["2026-04-05 provider risk and changelog digest"],
      draftConclusion:
        "Provider exposure looks synthesis-worthy, but it still needs a cleaner bridge from external signal to operator decision.",
      evidenceGained: [],
      remainingUncertainty: [
        "The corpus still has only a thin direct link between provider events and real operator posture changes.",
      ],
      recommendedNextStep:
        "Run one focused provider-risk pass, then either promote the exposure map or downgrade the question until better evidence arrives.",
      outcome: null,
      synthesisTitle: "OpenClaw provider exposure map",
      archiveTitle: null,
      canonicalUpdateTitle: null,
      maintenanceUpdateTitles: ["OpenClaw maintenance rhythm", "OpenClaw open questions"],
      questionStatusChange: null,
      resumeNotes: [
        "Keep this queued until the evidence reads like operator guidance, not just community signal.",
      ],
    },
    {
      id: "session-plugin-sdk-drift",
      questionId: "plugin-sdk-drift",
      title: "Collect plugin and SDK drift evidence",
      goal: "Decide whether the plugin-compatibility boundary has enough release-to-release evidence to harden into a stronger answer.",
      summary:
        "This queued evidence-gathering session keeps the thinnest high-value question visible without pretending the current corpus can answer it durably yet.",
      status: "queued",
      priority: "high",
      sessionDate: "2026-04-07T16:00:00.000Z",
      loadedContextPackTitles: ["Upgrade Watchpoints"],
      supportingContextPackTitles: ["Provenance And Review"],
      relevantPages: ["Plugin compatibility", "OpenClaw open questions", "Review History", "Summary Atlas"],
      relevantSources: ["2026-03-26 plugin SDK and policy digest"],
      draftConclusion:
        "The plugin drift story is clearly important, but the corpus still lacks enough longitudinal evidence to promote it beyond a visible open question.",
      evidenceGained: [],
      remainingUncertainty: [
        "The topic still needs concrete release-to-release proof of drift instead of one-off signals.",
      ],
      recommendedNextStep:
        "Wait for another release or changelog pass, then compare the new evidence against the existing compatibility and review-history notes.",
      outcome: null,
      synthesisTitle: null,
      archiveTitle: null,
      canonicalUpdateTitle: null,
      maintenanceUpdateTitles: ["OpenClaw open questions"],
      questionStatusChange: null,
      resumeNotes: [
        "Use Provenance And Review before writing any new durable answer here.",
      ],
    },
  ],
  researchSyntheses: [
    {
      id: "openclaw-current-tensions-synthesis",
      title: "OpenClaw current tensions",
      summary:
        "This published synthesis is the durable home for the flagship example's active trade-offs, so readers can see instability clearly without overloading the entity page.",
      goal: "Keep the fast-moving release, compatibility, and provider trade-offs visible in one durable synthesis.",
      status: "published",
      confidencePercent: 84,
      updatedAt: "2026-04-03T18:15:00.000Z",
      sourceQuestionIds: ["unstable-surfaces"],
      sourceSessionIds: ["session-unstable-surfaces"],
      evidenceSummary: [
        "Release cadence, plugin drift, and provider exposure recur across the bounded corpus.",
        "The instability story is already stable enough to live durably outside the canonical entity page.",
      ],
      durableConclusion:
        "OpenClaw is most useful where it is still moving, so the durable reading of the topic has to keep instability explicit instead of treating it as incidental noise.",
      provisionalBoundary:
        "The provider-exposure thread still wants a cleaner standalone synthesis before every practical consequence should be treated as settled guidance.",
      publishedPageTitle: "OpenClaw current tensions",
      canonicalUpdateTitles: ["OpenClaw", "OpenClaw release cadence"],
      maintenanceUpdateTitles: ["OpenClaw maintenance rhythm", "OpenClaw open questions"],
      watchpointUpdateTitles: ["OpenClaw maintenance watchpoints"],
      tensionUpdateTitles: ["OpenClaw current tensions"],
      archiveTitles: [],
      questionImpacts: [
        {
          questionId: "unstable-surfaces",
          effect: "resolved",
          note:
            "The instability question now has a durable synthesis and should only reopen when the operating story changes materially.",
        },
        {
          questionId: "provider-exposure-map",
          effect: "advanced",
          note:
            "The tension synthesis narrowed the remaining provider-risk work into a more specific synthesis candidate.",
        },
      ],
      decisions: [
        {
          type: "caution",
          title: "Treat release speed as an operating condition",
          summary:
            "The same motion that makes OpenClaw interesting also makes upgrade posture and regression depth important.",
          action:
            "Read release cadence together with monitoring surfaces before treating a new release as routine.",
        },
        {
          type: "watch",
          title: "Keep compatibility and provider drift visible",
          summary:
            "Plugin-surface drift and provider-side changes are not peripheral; they materially shape how stable the topic feels in practice.",
          action:
            "Reopen monitoring and the provider/compatibility surfaces whenever those boundaries shift.",
        },
      ],
      changedCanonicalSummary:
        "The flagship example now treats release cadence, compatibility drift, and provider exposure as the three durable lenses around OpenClaw's instability story.",
      recommendedNextStep:
        "Use this synthesis as the durable uncertainty layer, then decide which remaining tension deserves a more operational synthesis next.",
      revisitTriggers: [
        "A release note or provider signal changes what looks operationally unstable.",
      ],
    },
    {
      id: "openclaw-maintenance-watchpoints-synthesis",
      title: "OpenClaw maintenance watchpoints",
      summary:
        "This published monitoring synthesis turns the flagship example's research into operator-facing watch logic instead of leaving it scattered across release, risk, and note surfaces.",
      goal: "Convert the strongest upgrade-facing research into a durable monitoring synthesis that can actually guide action.",
      status: "published",
      confidencePercent: 88,
      updatedAt: "2026-04-04T20:15:00.000Z",
      sourceQuestionIds: ["monitor-before-upgrade", "unstable-surfaces"],
      sourceSessionIds: ["session-upgrade-monitoring-note", "session-unstable-surfaces"],
      evidenceSummary: [
        "The same upgrade-facing signals are already repeated across the archived note, risk page, and release cadence page.",
        "The watchpoints synthesis centralizes those signals into a reusable operating surface.",
      ],
      durableConclusion:
        "Upgrade posture in OpenClaw should be driven by a compact monitoring synthesis rather than by rereading every surrounding page from scratch.",
      provisionalBoundary:
        "Specific watch triggers should still reopen when provider or compatibility signals change the maintenance posture materially.",
      publishedPageTitle: "OpenClaw maintenance watchpoints",
      canonicalUpdateTitles: ["OpenClaw release cadence", "Plugin compatibility", "Provider dependency risk"],
      maintenanceUpdateTitles: ["OpenClaw maintenance rhythm", "OpenClaw open questions"],
      watchpointUpdateTitles: ["OpenClaw maintenance watchpoints"],
      tensionUpdateTitles: ["OpenClaw current tensions"],
      archiveTitles: ["Note: What should I monitor before upgrading OpenClaw"],
      questionImpacts: [
        {
          questionId: "monitor-before-upgrade",
          effect: "resolved",
          note:
            "The upgrade-monitoring question now has both a durable archived answer and a monitoring synthesis behind it.",
        },
        {
          questionId: "upgrade-regression-triggers",
          effect: "advanced",
          note:
            "The watchpoint synthesis narrowed the remaining work into a specific regression-trigger synthesis instead of a broad monitoring question.",
        },
      ],
      decisions: [
        {
          type: "recommendation",
          title: "Use watchpoints before upgrading",
          summary:
            "The highest-value upgrade behavior is to consult the monitoring synthesis before treating a release as routine.",
          action:
            "Read the watchpoints synthesis and archived note together before upgrade decisions.",
        },
        {
          type: "watch",
          title: "Watch provider and compatibility shifts closely",
          summary:
            "Provider-side restrictions and compatibility drift are the fastest paths to an outdated upgrade checklist.",
          action:
            "Rewrite the watchpoint synthesis first when those signals move, then update the archived note if the grounded answer changed.",
        },
      ],
      changedCanonicalSummary:
        "OpenClaw's canonical risk and release pages now feed a shared watchpoint surface, which makes the maintenance story more operational and less diffuse.",
      recommendedNextStep:
        "Use the watchpoints synthesis as the default operator view, then publish the regression-trigger synthesis to make the upgrade rule set more durable.",
      revisitTriggers: [
        "Release notes begin signaling a different regression depth.",
        "Provider-side restrictions or compatibility drift make the current watch logic incomplete.",
      ],
    },
    {
      id: "openclaw-upgrade-regression-triggers",
      title: "OpenClaw upgrade regression triggers",
      summary:
        "This ready synthesis is the highest-leverage next durable output because the release, monitoring, and archived-answer surfaces already contain most of the rule set.",
      goal: "Turn repeated upgrade-reading work into a durable synthesis that distinguishes light checks from full regression runs.",
      status: "ready",
      confidencePercent: 79,
      updatedAt: "2026-04-05T19:10:00.000Z",
      sourceQuestionIds: ["upgrade-regression-triggers"],
      sourceSessionIds: ["session-upgrade-regression-triggers"],
      evidenceSummary: [
        "Release cadence, watchpoints, and the archived monitoring note already converge on the same trigger logic.",
      ],
      durableConclusion:
        "OpenClaw is ready for a synthesis that turns repeated release and changelog cues into a durable regression-depth rule set.",
      provisionalBoundary:
        "The synthesis should stay narrow: upgrade triggers and regression depth, not a generic retelling of all maintenance concerns.",
      publishedPageTitle: null,
      canonicalUpdateTitles: ["OpenClaw release cadence"],
      maintenanceUpdateTitles: ["OpenClaw maintenance rhythm", "OpenClaw open questions"],
      watchpointUpdateTitles: ["OpenClaw maintenance watchpoints"],
      tensionUpdateTitles: [],
      archiveTitles: ["Note: What should I monitor before upgrading OpenClaw"],
      questionImpacts: [
        {
          questionId: "upgrade-regression-triggers",
          effect: "resolved",
          note:
            "Publishing this synthesis would close the highest-leverage remaining upgrade question in the flagship example.",
        },
      ],
      decisions: [
        {
          type: "recommendation",
          title: "Publish the regression-trigger synthesis next",
          summary:
            "This is the clearest next conversion of session work into durable operator guidance.",
          action:
            "Complete the active synthesis session, then update release cadence, watchpoints, and maintenance rhythm together.",
        },
        {
          type: "watch",
          title: "Keep changelog packaging in the decision loop",
          summary:
            "The synthesis should make changelog and release packaging part of the durable trigger logic, not an incidental detail.",
          action:
            "Include changelog packaging signals explicitly when publishing the synthesis.",
        },
      ],
      changedCanonicalSummary:
        "Publishing this synthesis would move upgrade-regression logic out of scattered notes and into the canonical release/maintenance bridge.",
      recommendedNextStep:
        "Finish the active synthesis session and publish the trigger map with coordinated updates to release cadence, watchpoints, and the open-question queue.",
      revisitTriggers: [
        "Release packaging changes invalidate the current trigger logic.",
      ],
    },
    {
      id: "openclaw-provider-exposure-map",
      title: "OpenClaw provider exposure map",
      summary:
        "This in-progress synthesis is close enough to matter, but it still needs one cleaner pass that ties provider events directly to operator decisions.",
      goal: "Turn scattered provider-risk observations into a durable map of what provider-side changes actually matter for adoption and upgrades.",
      status: "in-progress",
      confidencePercent: 64,
      updatedAt: "2026-04-06T16:00:00.000Z",
      sourceQuestionIds: ["provider-exposure-map"],
      sourceSessionIds: ["session-provider-exposure-map"],
      evidenceSummary: [
        "Provider risk is visible across the concept page, tensions synthesis, and monitoring note, but still wants a cleaner operator-facing bridge.",
      ],
      durableConclusion:
        "The system is close to supporting a provider-exposure synthesis, but the current evidence still reads more like a strong working map than a final durable judgment.",
      provisionalBoundary:
        "The synthesis should not publish until it can show direct operator consequences rather than general provider concern.",
      publishedPageTitle: null,
      canonicalUpdateTitles: ["Provider dependency risk"],
      maintenanceUpdateTitles: ["OpenClaw maintenance rhythm", "OpenClaw open questions"],
      watchpointUpdateTitles: ["OpenClaw maintenance watchpoints"],
      tensionUpdateTitles: ["OpenClaw current tensions"],
      archiveTitles: [],
      questionImpacts: [
        {
          questionId: "provider-exposure-map",
          effect: "advanced",
          note:
            "The question has moved from broad concern to a near-synthesis workflow target, but it is not yet durably resolved.",
        },
      ],
      decisions: [
        {
          type: "caution",
          title: "Do not publish on ambient concern alone",
          summary:
            "Provider exposure should only harden when the synthesis can connect provider events to concrete operator decisions.",
          action:
            "Keep the synthesis in progress until the operator consequences are explicit enough to survive as durable guidance.",
        },
        {
          type: "watch",
          title: "Track provider restrictions as reopen triggers",
          summary:
            "Provider-side restrictions are still the fastest way for this synthesis to become much more concrete.",
          action:
            "Use provider restrictions or access-policy changes as the main trigger for the next focused pass.",
        },
      ],
      changedCanonicalSummary:
        "If published, this synthesis would sharpen the provider-risk concept page and make its operator consequences much clearer.",
      recommendedNextStep:
        "Run one tighter provider-focused pass and either publish this synthesis or explicitly downgrade it back to a candidate.",
      revisitTriggers: [
        "A provider-side restriction or policy shift changes adoption assumptions materially.",
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
