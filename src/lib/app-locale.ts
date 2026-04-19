import type { QuestionWorkflowItem } from "@/lib/contracts/research-question";
import type { ResearchSessionItem } from "@/lib/contracts/research-session";
import type {
  ResearchSynthesisDecisionType,
  ResearchSynthesisItem,
} from "@/lib/contracts/research-synthesis";
import type { TopicMaturityStage } from "@/lib/contracts/topic-evaluation";
import type {
  ResolvedWikiLink,
  UnresolvedWikiLink,
  WikiPageType,
} from "@/lib/contracts/wiki";

export const APP_LOCALES = ["en", "zh"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = "en";
export const APP_LOCALE_STORAGE_KEY = "research-wiki.ui-locale";
export const APP_LOCALE_COOKIE_NAME = "research-wiki.ui-locale";

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return value === "zh" ? "zh" : "en";
}

export function localeToHtmlLang(locale: AppLocale) {
  return locale === "zh" ? "zh-CN" : "en";
}

export function localeToIntlTag(locale: AppLocale) {
  return locale === "zh" ? "zh-CN" : "en-US";
}

function formatCount(
  locale: AppLocale,
  count: number,
  englishSingular: string,
  englishPlural: string,
  chineseSuffix: string,
) {
  return locale === "zh"
    ? `${count}${chineseSuffix}`
    : `${count} ${count === 1 ? englishSingular : englishPlural}`;
}

type SurfacePath =
  | "/topics"
  | "/questions"
  | "/gaps"
  | "/acquisition"
  | "/sessions"
  | "/syntheses"
  | "/changes"
  | "/monitoring"
  | "/onboarding"
  | "/dashboard"
  | "/sources"
  | "/wiki"
  | "/reviews"
  | "/ask"
  | "/audits"
  | "/settings";

export function getProductSurfaceLabel(locale: AppLocale, href: string) {
  const labels: Record<SurfacePath, string> =
    locale === "zh"
      ? {
          "/topics": "主题",
          "/questions": "问题",
          "/gaps": "差距",
          "/acquisition": "采集",
          "/sessions": "轮次",
          "/syntheses": "综合",
          "/changes": "变化",
          "/monitoring": "监测",
          "/onboarding": "初始化",
          "/dashboard": "首页",
          "/sources": "来源",
          "/wiki": "知识库",
          "/reviews": "评审",
          "/ask": "提问",
          "/audits": "审计",
          "/settings": "设置",
        }
      : {
          "/topics": "Topics",
          "/questions": "Questions",
          "/gaps": "Gaps",
          "/acquisition": "Acquisition",
          "/sessions": "Sessions",
          "/syntheses": "Syntheses",
          "/changes": "Changes",
          "/monitoring": "Monitoring",
          "/onboarding": "Onboarding",
          "/dashboard": "Dashboard",
          "/sources": "Sources",
          "/wiki": "Wiki",
          "/reviews": "Reviews",
          "/ask": "Ask",
          "/audits": "Audits",
          "/settings": "Settings",
        };

  return labels[href as SurfacePath] ?? href;
}

export function getProductSurfaceDetail(locale: AppLocale, href: string) {
  const details: Record<SurfacePath, string> =
    locale === "zh"
      ? {
          "/topics": "选择一个主题。",
          "/questions": "选择下一道问题。",
          "/gaps": "查看缺口证据。",
          "/acquisition": "安排补充采集。",
          "/sessions": "继续当前轮次。",
          "/syntheses": "查看接近定稿的结论。",
          "/changes": "最近的证据变化。",
          "/monitoring": "观察需要持续跟踪的信号。",
          "/onboarding": "初始化工作区。",
          "/dashboard": "工作区入口。",
          "/sources": "导入材料。",
          "/wiki": "浏览编译后的页面。",
          "/reviews": "查看待批注变更。",
          "/ask": "向工作区提问。",
          "/audits": "检查结构性问题。",
          "/settings": "调整工作区配置。",
        }
      : {
          "/topics": "Choose a topic.",
          "/questions": "Choose the next question.",
          "/gaps": "Missing evidence.",
          "/acquisition": "Collection tasks.",
          "/sessions": "Continue active sessions.",
          "/syntheses": "Review what is ready.",
          "/changes": "Recent evidence shifts.",
          "/monitoring": "Watch signals.",
          "/onboarding": "Workspace setup.",
          "/dashboard": "Workspace entry.",
          "/sources": "Imported material.",
          "/wiki": "Compiled pages.",
          "/reviews": "Pending changes.",
          "/ask": "Ask the workspace.",
          "/audits": "Coverage and contradictions.",
          "/settings": "Workspace settings.",
        };

  return details[href as SurfacePath] ?? "";
}

export function getTopicMaturityStageLabel(locale: AppLocale, stage: TopicMaturityStage) {
  const labels: Record<TopicMaturityStage, string> =
    locale === "zh"
      ? {
          flagship: "旗舰",
          mature: "成熟",
          maintained: "维护中",
          developing: "发展中",
          starter: "起步",
        }
      : {
          flagship: "flagship",
          mature: "mature",
          maintained: "maintained",
          developing: "developing",
          starter: "starter",
        };

  return labels[stage];
}

export function getQuestionStatusLabel(locale: AppLocale, status: QuestionWorkflowItem["status"]) {
  const labels: Record<QuestionWorkflowItem["status"], string> =
    locale === "zh"
      ? {
          open: "开放",
          active: "进行中",
          blocked: "受阻",
          "waiting-for-sources": "待补来源",
          "ready-for-synthesis": "可进入综合",
          synthesized: "已综合",
          stale: "需刷新",
        }
      : {
          open: "open",
          active: "active",
          blocked: "blocked",
          "waiting-for-sources": "waiting for sources",
          "ready-for-synthesis": "ready for synthesis",
          synthesized: "synthesized",
          stale: "stale",
        };

  return labels[status];
}

export function getPriorityLabel(locale: AppLocale, priority: "high" | "medium" | "low") {
  if (locale === "zh") {
    return priority === "high" ? "高" : priority === "medium" ? "中" : "低";
  }

  return priority;
}

export function getSessionStatusLabel(locale: AppLocale, status: ResearchSessionItem["status"]) {
  const labels: Record<ResearchSessionItem["status"], string> =
    locale === "zh"
      ? {
          queued: "排队中",
          active: "进行中",
          completed: "已完成",
        }
      : {
          queued: "queued",
          active: "active",
          completed: "completed",
        };

  return labels[status];
}

export function getSessionOutcomeLabel(
  locale: AppLocale,
  outcome: ResearchSessionItem["outcome"],
) {
  if (outcome === null) {
    return locale === "zh" ? "进行中" : "in progress";
  }

  const labels: Record<Exclude<ResearchSessionItem["outcome"], null>, string> =
    locale === "zh"
      ? {
          "question-advanced": "问题已推进",
          "updated-working-note": "已更新工作笔记",
          "updated-canonical": "已更新正式页",
          "ready-for-synthesis": "可进入综合",
          synthesized: "已综合",
          "needs-more-sources": "仍需更多来源",
          "archived-answer": "已归档回答",
        }
      : {
          "question-advanced": "question advanced",
          "updated-working-note": "updated working note",
          "updated-canonical": "updated canonical",
          "ready-for-synthesis": "ready for synthesis",
          synthesized: "synthesized",
          "needs-more-sources": "needs more sources",
          "archived-answer": "archived answer",
        };

  return labels[outcome];
}

export function getSynthesisStatusLabel(locale: AppLocale, status: ResearchSynthesisItem["status"]) {
  const labels: Record<ResearchSynthesisItem["status"], string> =
    locale === "zh"
      ? {
          candidate: "候选",
          "in-progress": "进行中",
          ready: "就绪",
          published: "已发布",
          stale: "需刷新",
        }
      : {
          candidate: "candidate",
          "in-progress": "in progress",
          ready: "ready",
          published: "published",
          stale: "stale",
        };

  return labels[status];
}

export function getSynthesisDecisionTypeLabel(
  locale: AppLocale,
  type: ResearchSynthesisDecisionType,
) {
  const labels: Record<ResearchSynthesisDecisionType, string> =
    locale === "zh"
      ? {
          recommendation: "建议",
          comparison: "对比",
          caution: "谨慎",
          watch: "观察",
          "not-enough-evidence": "证据不足",
        }
      : {
          recommendation: "recommendation",
          comparison: "comparison",
          caution: "caution",
          watch: "watch",
          "not-enough-evidence": "not enough evidence",
        };

  return labels[type];
}

export function getQuestionEffectLabel(
  locale: AppLocale,
  effect: ResearchSynthesisItem["questionImpacts"][number]["effect"],
) {
  const labels: Record<ResearchSynthesisItem["questionImpacts"][number]["effect"], string> =
    locale === "zh"
      ? {
          resolved: "已解决",
          reframed: "已重写",
          advanced: "已推进",
          reopened: "重新打开",
        }
      : {
          resolved: "resolved",
          reframed: "reframed",
          advanced: "advanced",
          reopened: "reopened",
        };

  return labels[effect];
}

export function getReviewStatusLabel(locale: AppLocale, status: string) {
  if (locale === "zh") {
    switch (status) {
      case "approved":
        return "已批准";
      case "pending":
        return "待处理";
      case "rejected":
        return "已拒绝";
      default:
        return status.replace(/-/g, " ");
    }
  }

  return status.replace(/-/g, " ");
}

export function getWikiLinkResolutionKindLabel(
  locale: AppLocale,
  resolutionKind: ResolvedWikiLink["resolutionKind"],
) {
  const labels: Record<ResolvedWikiLink["resolutionKind"], string> =
    locale === "zh"
      ? {
          title: "标题",
          canonicalTitle: "正式标题",
          slug: "Slug",
          alias: "别名",
        }
      : {
          title: "title",
          canonicalTitle: "canonical title",
          slug: "slug",
          alias: "alias",
        };

  return labels[resolutionKind];
}

export function getWikiLinkGapReasonLabel(
  locale: AppLocale,
  reason: UnresolvedWikiLink["reason"],
) {
  const labels: Record<UnresolvedWikiLink["reason"], string> =
    locale === "zh"
      ? {
          missing: "缺失",
          ambiguous: "歧义",
        }
      : {
          missing: "missing",
          ambiguous: "ambiguous",
        };

  return labels[reason];
}

export function getWikiPageTypeLabel(locale: AppLocale, type: WikiPageType) {
  const labels: Record<WikiPageType, string> =
    locale === "zh"
      ? {
          index: "索引",
          topic: "主题",
          entity: "实体",
          concept: "概念",
          timeline: "时间线",
          synthesis: "综合",
          note: "笔记",
        }
      : {
          index: "Index",
          topic: "Topics",
          entity: "Entities",
          concept: "Concepts",
          timeline: "Timelines",
          synthesis: "Syntheses",
          note: "Notes",
        };

  return labels[type];
}

export function getWikiEntryMeta(locale: AppLocale, type: WikiPageType) {
  if (locale === "zh") {
    const meta: Record<WikiPageType, { label: string; description: string }> = {
      index: {
        label: "索引页",
        description: "帮助读者进入更大范围知识区的入口页。",
      },
      topic: {
        label: "主题综述",
        description: "把较大主题组织成长期入口页的稳定文章。",
      },
      concept: {
        label: "概念条目",
        description: "定义可复用概念及其在知识库中位置的参考页。",
      },
      entity: {
        label: "实体条目",
        description: "为命名系统、角色、工具或产物保留的稳定参考页。",
      },
      timeline: {
        label: "时间线条目",
        description: "帮助跟踪时间变化的编年页。",
      },
      synthesis: {
        label: "研究综合",
        description: "把多份材料编译成一页可审阅综合的结果页。",
      },
      note: {
        label: "知识笔记",
        description: "与知识库保持联动的长期笔记或归档回答。",
      },
    };

    return meta[type];
  }

  const meta: Record<WikiPageType, { label: string; description: string }> = {
    index: {
      label: "Index entry",
      description: "An entry page that helps readers navigate a broader area of the wiki.",
    },
    topic: {
      label: "Topic overview",
      description: "A broad explanatory article that organizes a larger subject into a durable entry.",
    },
    concept: {
      label: "Concept entry",
      description: "A reference article that defines a reusable idea and its place in the knowledge base.",
    },
    entity: {
      label: "Entity entry",
      description: "A durable reference entry for a named system, actor, tool, or artifact.",
    },
    timeline: {
      label: "Timeline entry",
      description: "A chronology-focused article that helps track change over time.",
    },
    synthesis: {
      label: "Research synthesis",
      description: "A compiled article that combines multiple materials into one reviewable synthesis.",
    },
    note: {
      label: "Wiki note",
      description: "A durable note or archived answer that remains integrated with the rest of the wiki.",
    },
  };

  return meta[type];
}

export function getWorkingCueDefinitions(locale: AppLocale) {
  const title = (en: string, zh: string) => (locale === "zh" ? zh : en);

  return [
    {
      title: title("Start here", "先看这里"),
      headings: ["Start here", "Key pages", "Primary reading path", "从这里开始", "关键页面", "主阅读路径"],
    },
    {
      title: title("Reading path", "阅读路径"),
      headings: ["Reading path", "Reading paths", "Orientation pass", "阅读路径", "导读路径", "熟悉路径"],
    },
    {
      title: title("Watchpoints", "观察点"),
      headings: ["Watchpoints", "Monitoring", "What to monitor", "观察点", "监测", "需要关注什么"],
    },
    {
      title: title("Current tensions", "当前张力"),
      headings: ["Current tensions", "Open fronts", "Tensions", "当前张力", "开放前线", "张力"],
    },
    {
      title: title("Open questions", "开放问题"),
      headings: ["Open questions", "Follow-up questions", "Questions", "开放问题", "后续问题", "问题"],
    },
    {
      title: title("Artifact ladder", "产物梯度"),
      headings: ["Artifact ladder", "Visible artifacts", "Artifact trail", "产物梯度", "可见产物", "产物轨迹"],
    },
    {
      title: title("Revisit next", "下次回看"),
      headings: [
        "Revisit next",
        "Review cadence",
        "Resume without rereading everything",
        "下次回看",
        "复查节奏",
        "无需重读的恢复路径",
      ],
    },
    {
      title: title("Context refresh", "上下文刷新"),
      headings: [
        "Context packs to refresh",
        "Feed to the model",
        "Available packs",
        "需要刷新的上下文包",
        "投给模型的材料",
        "可用上下文包",
      ],
    },
    {
      title: title("Synthesis candidates", "综合候选"),
      headings: [
        "Synthesis candidates",
        "Synthesis decisions",
        "Published syntheses",
        "What should become synthesis next",
        "What might become synthesis next",
        "综合候选",
        "综合决策",
        "已发布综合",
        "下一步该变成综合的内容",
      ],
    },
    {
      title: title("Working surfaces", "工作表面"),
      headings: [
        "Canonical vs working surfaces",
        "Maintenance surfaces",
        "Working surfaces",
        "正式页与工作页",
        "维护表面",
        "工作表面",
      ],
    },
  ] as const;
}

export function getLocaleCopy(locale: AppLocale) {
  const zh = locale === "zh";

  return {
    language: {
      label: zh ? "语言" : "Language",
      description: zh ? "产品界面" : "Product UI",
      settingsTitle: zh ? "界面语言" : "Interface language",
      settingsDescription: zh
        ? "切换主界面的显示语言。设置会保存在浏览器里，并在刷新和后续路由中保持。"
        : "Switch the runtime product UI language. The preference stays in this browser across reloads and route transitions.",
      english: "English",
      chinese: "中文",
      saving: zh ? "正在切换…" : "Switching...",
    },
    shell: {
      focusWorkspace: zh ? "工作区" : "Workspace",
      focusTopic: zh ? "主题" : "Topic",
      headerShowcase: zh ? "官方案例" : "Showcase",
      headerDashboard: zh ? "首页" : "Dashboard",
      headerTopic: zh ? "主题" : "Topic",
      fallbackSurfaceLabel: "Research Wiki Compiler",
      fallbackSurfaceDetail: zh ? "打开一个页面。" : "Open a page.",
      showcaseLabel: zh ? "案例" : "Showcase",
      showcaseDetail: zh ? "渲染后的示例。" : "Rendered example.",
      topicLabel: zh ? "主题" : "Topic",
    },
    dashboard: {
      workspaceEyebrow: zh ? "工作区" : "Workspace",
      ready: zh ? "就绪" : "ready",
      setup: zh ? "待设置" : "setup",
      reviewBadge: (count: number) =>
        zh ? `${count} 条评审` : `${count} review${count === 1 ? "" : "s"}`,
      topics: zh ? "主题" : "Topics",
      wiki: zh ? "知识库" : "Wiki",
      showcase: zh ? "案例" : "Showcase",
      settings: zh ? "设置" : "Settings",
      workspaceTools: zh ? "工作区工具" : "Workspace tools",
      hideWorkspaceTools: zh ? "收起工具" : "Hide tools",
      pages: zh ? "页面" : "Pages",
      allPages: zh ? "全部页面" : "All pages",
      noWikiPagesYet: zh ? "还没有知识页面。" : "No wiki pages yet",
      activeRoot: zh ? "当前根目录" : "Active root",
      workspaceNotInitialized: zh ? "工作区尚未初始化" : "Workspace not initialized",
      fileFirstSetup: zh ? "文件优先初始化" : "File-first setup",
      dashboardEyebrow: zh ? "首页" : "Dashboard",
      setUpLocalWorkspace: zh ? "先把本地工作区搭起来。" : "Set up a local workspace.",
      failedLoad: zh ? "加载首页概览失败。" : "Failed to load dashboard overview.",
      failedRefresh: zh ? "刷新首页概览失败。" : "Failed to refresh dashboard overview.",
    },
    workspaceSetup: {
      title: zh ? "初始化工作区" : "Workspace Initialization",
      description: zh
        ? "创建本地优先工作区结构、复制可见 prompt、初始化 SQLite，并按需初始化 git。"
        : "Initialize the local-first workspace structure, copy visible prompt files, bootstrap SQLite, and optionally start git.",
      workspaceRoot: zh ? "工作区根目录" : "Workspace Root",
      workspaceName: zh ? "工作区名称" : "Workspace Name",
      initializeGit: zh ? "默认在工作区内初始化 git" : "Initialize git inside the workspace by default",
      working: zh ? "处理中…" : "Working...",
      initializeWorkspace: zh ? "初始化工作区" : "Initialize Workspace",
      refreshStatus: zh ? "刷新状态" : "Refresh Status",
      snapshotTitle: zh ? "工作区快照" : "Workspace Snapshot",
      snapshotDescription: zh
        ? "查看当前工作区根目录下的本地状态，确认文件结构、数据库和设置是否健康。"
        : "Visible local state from the current workspace root so you can confirm the file-backed workspace, database, and settings are healthy.",
      initialized: zh ? "已初始化" : "Initialized",
      notInitialized: zh ? "未初始化" : "Not initialized",
      sqliteReady: zh ? "SQLite 已就绪" : "SQLite ready",
      dbMissing: zh ? "数据库缺失" : "DB missing",
      gitReady: zh ? "Git 已就绪" : "Git ready",
      gitMissing: zh ? "Git 缺失" : "Git missing",
      tables: zh ? "数据表" : "Tables",
      noTablesYet: zh ? "还没有数据表" : "No tables yet",
      workspaceRecord: zh ? "工作区记录" : "Workspace Record",
      root: zh ? "根目录" : "Root",
      name: zh ? "名称" : "Name",
      status: zh ? "状态" : "Status",
      unavailable: zh ? "无" : "N/A",
      uninitialized: zh ? "未初始化" : "uninitialized",
      requiredPaths: zh ? "必需路径" : "Required paths",
      relativePath: zh ? "相对路径" : "Relative path",
      kind: zh ? "类型" : "Kind",
      state: zh ? "状态" : "State",
      present: zh ? "存在" : "Present",
      missing: zh ? "缺失" : "Missing",
      settingsJson: zh ? "设置 JSON" : "Settings JSON",
    },
    settings: {
      loading: zh ? "正在加载设置…" : "Loading settings...",
      eyebrow: zh ? "设置" : "Settings",
      title: zh ? "工作区应用与模型设置" : "Workspace apply and provider settings",
      description: zh
        ? "Provider 凭据、默认模型和评审行为都保存在工作区里，让 summarization、planning 和可选 git commit 保持本地、明确、可复现。"
        : "Provider credentials, model defaults, and review behavior stay inside the workspace so summarization, planning, and optional git commits remain local, explicit, and reproducible.",
      badge: zh ? "工作区本地配置" : "Workspace-local config",
      saveNotice: zh ? "工作区设置已保存到 .research-wiki/settings.json。" : "Workspace settings saved to .research-wiki/settings.json.",
      llmSettingsTitle: zh ? "LLM 设置" : "LLM Settings",
      llmSettingsDescription: zh
        ? "配置来源总结和 patch planning 使用的 provider 与模型。"
        : "Configure the provider and model used for source summarization and patch planning.",
      activeProvider: zh ? "当前 provider" : "Active provider",
      noProviderSelected: zh ? "尚未选择 provider" : "No provider selected",
      activeModelOverride: zh ? "模型覆盖" : "Active model override",
      activeModelPlaceholder: zh ? "为当前 provider 设置可选模型覆盖" : "Optional override for the selected provider",
      structuredOutput: zh ? "结构化输出" : "Structured output",
      toolOutput: zh ? "工具输出" : "Tool output",
      apiKey: "API key",
      defaultModel: zh ? "默认模型" : "Default model",
      openAiPlaceholder: "sk-...",
      openAiModelPlaceholder: zh ? "例如 gpt-4.1-mini" : "gpt-4.1-mini or similar",
      anthropicPlaceholder: "sk-ant-...",
      anthropicModelPlaceholder: zh ? "例如 claude-sonnet-4-5" : "claude-sonnet-4-5 or similar",
      saveSettings: zh ? "保存设置" : "Save settings",
      keyStorageNote: (workspaceRoot: string) =>
        zh
          ? `密钥会保存在本地的 \`${workspaceRoot}/.research-wiki/settings.json\`。`
          : `Keys are stored locally in \`${workspaceRoot}/.research-wiki/settings.json\`.`,
      usageNotesTitle: zh ? "使用说明" : "Usage Notes",
      usageNotesDescription: zh
        ? "这些凭据用于本地工作区中的来源总结、patch planning 和回答生成。"
        : "These credentials are used for source summarization, patch planning, and answer generation in the local workspace.",
      activeWorkspace: zh ? "当前工作区：" : "Active workspace:",
      summaryNote: zh
        ? "总结产物仍然是文件化的。模型负责生成可见的 markdown 和 JSON 产物，而不是隐藏记忆。"
        : "Summary outputs remain file-backed. The model is used to create visible markdown and JSON artifacts, not hidden memory.",
      reviewNote: zh
        ? "评审设置控制显式 patch apply 行为，不会引入隐藏自动化。"
        : "Review settings control explicit patch-apply behavior without introducing hidden automation.",
      reviewApplyTitle: zh ? "评审应用设置" : "Review Apply Settings",
      reviewApplyDescription: zh
        ? "控制显式的评审行为。Git commit 仍然是可选项，而且不会阻塞成功 apply。"
        : "Control explicit review behavior. Git commits remain optional and never block a successful apply.",
      autoDraftTitle: zh ? "自动起草低风险提案" : "Auto-draft low-risk proposals",
      autoDraftDescription: zh
        ? "除非你明确需要自动生成未来的低风险草稿，否则保持关闭。草稿仍然需要人工评审。"
        : "Keep this disabled unless you want future low-risk drafts generated automatically but still reviewed.",
      gitCommitTitle: zh ? "应用后创建 git commit" : "Create git commit after apply",
      gitCommitDescription: zh
        ? "如果工作区是 git 仓库，成功 apply 后可以只暂存受影响文件并创建清晰的评审派生 commit。"
        : "If the workspace is a git repo, successful applies can stage only affected files and create a clear review-derived commit.",
      failedLoad: zh ? "加载设置失败。" : "Failed to load settings.",
      failedSave: zh ? "保存设置失败。" : "Failed to save settings.",
    },
    topics: {
      eyebrow: zh ? "工作区" : "Workspace",
      title: zh ? "选择一个主题" : "Choose a topic",
      officialShowcase: zh ? "官方案例" : "official showcase",
      walkthrough: zh ? "导览" : "Walkthrough",
      open: zh ? "打开" : "Open",
      openShowcase: zh ? "打开案例" : "Open showcase",
      otherTopics: zh ? "其他主题" : "Other topics",
      topics: zh ? "主题" : "Topics",
      showcase: zh ? "案例" : "showcase",
      example: zh ? "示例" : "example",
    },
    topicHome: {
      question: zh ? "问题" : "Question",
      session: zh ? "轮次" : "Session",
      synthesis: zh ? "综合" : "Synthesis",
      blocker: zh ? "阻塞" : "Blocker",
      signal: zh ? "信号" : "Signal",
      noQuestion: zh ? "还没有问题" : "No question yet",
      noSession: zh ? "还没有轮次" : "No session yet",
      noSynthesis: zh ? "还没有综合" : "No synthesis yet",
      questions: zh ? "问题" : "Questions",
      sessions: zh ? "轮次" : "Sessions",
      syntheses: zh ? "综合" : "Syntheses",
      continue: zh ? "继续" : "Continue",
      gaps: zh ? "差距" : "Gaps",
      changes: zh ? "变化" : "Changes",
      monitoring: zh ? "监测" : "Monitoring",
      acquisition: zh ? "采集" : "Acquisition",
      showcase: zh ? "案例" : "showcase",
      example: zh ? "示例" : "example",
      confidence: (percent: number) => (zh ? `${percent}% 置信度` : `${percent}% confidence`),
      openClawBadge: (mode: string) =>
        zh ? `${mode === "live" ? "实时" : "参考"}示例` : `${mode} example`,
    },
    questions: {
      eyebrow: zh ? "问题" : "Questions",
      pageTitle: (topicTitle?: string | null) => (topicTitle ? `${topicTitle}${zh ? " 问题" : " questions"}` : zh ? "问题" : "Questions"),
      badge: (count: number) => formatCount(locale, count, "question", "questions", " 个问题"),
      topics: zh ? "主题" : "Topics",
      topic: zh ? "主题" : "Topic",
      showcase: zh ? "案例" : "Showcase",
      sessions: zh ? "轮次" : "Sessions",
      syntheses: zh ? "综合" : "Syntheses",
      next: zh ? "下一步" : "Next",
      ready: zh ? "就绪" : "Ready",
      needSources: zh ? "待补来源" : "Need sources",
      reopen: zh ? "重开" : "Reopen",
      grounded: zh ? "已落地" : "Grounded",
      byStatus: zh ? "按状态" : "By status",
      topicsSection: zh ? "主题" : "Topics",
      noQueuedQuestions: zh ? "当前没有排队中的研究问题。" : "No active research questions are currently queued.",
      nothingHere: zh ? "这里还没有内容。" : "Nothing here.",
      load: zh ? "先读" : "Load",
      why: zh ? "原因" : "Why",
      synthesis: zh ? "综合" : "Synthesis",
      gaps: zh ? "差距" : "Gaps",
      reopenLabel: zh ? "重开条件" : "Reopen",
      session: zh ? "轮次" : "Session",
      last: zh ? "最近变化" : "Last",
      continue: zh ? "继续" : "Continue",
      note: zh ? "笔记" : "Note",
      maintenance: zh ? "维护" : "Maintenance",
      page: zh ? "页面" : "Page",
      synthesisTarget: zh ? "综合目标" : "Synthesis target",
      nextQuestion: zh ? "下一道问题" : "Next question",
      loadFirst: (pack: string) => (zh ? `先加载 ${pack}。` : `Load ${pack} first.`),
      summaryReady: (count: number) => formatCount(locale, count, "ready for synthesis", "ready for synthesis", " 条可进入综合"),
      summaryNeedSources: (count: number) => formatCount(locale, count, "need sources", "need sources", " 条待补来源"),
      summaryWatchForReopen: (count: number) => formatCount(locale, count, "watch for reopen", "watch for reopen", " 条待重开"),
    },
    sessions: {
      eyebrow: zh ? "轮次" : "Sessions",
      pageTitle: (topicTitle?: string | null, focusedQuestion?: boolean) =>
        focusedQuestion
          ? zh
            ? "当前轮次"
            : "Focused session"
          : topicTitle
            ? `${topicTitle}${zh ? " 轮次" : " sessions"}`
            : zh
              ? "轮次"
              : "Sessions",
      badge: (count: number) => formatCount(locale, count, "session", "sessions", " 个轮次"),
      questions: zh ? "问题" : "Questions",
      syntheses: zh ? "综合" : "Syntheses",
      topic: zh ? "主题" : "Topic",
      showcase: zh ? "案例" : "Showcase",
      queued: zh ? "排队中" : "Queued",
      active: zh ? "进行中" : "Active",
      done: zh ? "完成" : "Done",
      state: zh ? "改写状态" : "State",
      durable: zh ? "沉淀" : "Durable",
      nearSynthesis: zh ? "接近综合" : "Near synthesis",
      next: zh ? "下一步" : "Next",
      byStatus: zh ? "按状态" : "By status",
      topicsSection: zh ? "主题" : "Topics",
      noSessions: zh ? "还没有轮次。" : "No sessions yet.",
      nothingHere: zh ? "这里还没有内容。" : "Nothing here.",
      question: zh ? "问题" : "Question",
      goal: zh ? "目标" : "Goal",
      loadFirst: zh ? "先读" : "Load first",
      nextField: zh ? "下一步" : "Next",
      conclusion: zh ? "结论" : "Conclusion",
      resume: zh ? "恢复提示" : "Resume",
      gaps: zh ? "差距" : "Gaps",
      note: zh ? "笔记" : "Note",
      maintenance: zh ? "维护" : "Maintenance",
      synthesis: zh ? "综合" : "Synthesis",
      page: zh ? "页面" : "Page",
      nextSession: zh ? "下一轮次" : "Next session",
      latestCompletedSession: zh ? "最近完成轮次" : "Latest completed session",
      summaryActive: (count: number) => formatCount(locale, count, "active", "active", " 条进行中"),
      summaryQueued: (count: number) => formatCount(locale, count, "queued", "queued", " 条排队中"),
      summaryCompleted: (count: number) => formatCount(locale, count, "completed", "completed", " 条已完成"),
      summaryChangedState: (count: number) =>
        formatCount(locale, count, "changed question state", "changed question state", " 条改写了问题状态"),
    },
    syntheses: {
      eyebrow: zh ? "综合" : "Syntheses",
      pageTitle: (topicTitle?: string | null) =>
        topicTitle ? `${topicTitle}${zh ? " 综合" : " syntheses"}` : zh ? "综合" : "Syntheses",
      badge: (count: number) => formatCount(locale, count, "synthesis", "syntheses", " 个综合"),
      sessions: zh ? "轮次" : "Sessions",
      questions: zh ? "问题" : "Questions",
      topics: zh ? "主题" : "Topics",
      topic: zh ? "主题" : "Topic",
      showcase: zh ? "案例" : "Showcase",
      ready: zh ? "就绪" : "Ready",
      loop: zh ? "决策回路" : "Loop",
      published: zh ? "已发布" : "Published",
      canon: zh ? "正式页" : "Canon",
      watch: zh ? "观察点" : "Watch",
      focus: zh ? "焦点" : "Focus",
      byStatus: zh ? "按状态" : "By status",
      topicsSection: zh ? "主题" : "Topics",
      questionsField: zh ? "问题" : "Questions",
      sessionsField: zh ? "轮次" : "Sessions",
      noLinkedSessions: zh ? "还没有关联轮次。" : "No linked sessions yet.",
      conclusion: zh ? "结论" : "Conclusion",
      openEdge: zh ? "开放边界" : "Open edge",
      pageChange: zh ? "页面变化" : "Page change",
      decisions: zh ? "决策" : "Decisions",
      questionEffects: zh ? "对问题的影响" : "Question effects",
      gaps: zh ? "差距" : "Gaps",
      maintenance: zh ? "维护" : "Maintenance",
      publishedPage: zh ? "已发布" : "Published",
      targetPage: zh ? "目标页" : "Target",
      page: zh ? "页面" : "Page",
      noSyntheses: zh ? "还没有综合。" : "No syntheses yet.",
      nothingHere: zh ? "这里还没有内容。" : "Nothing here.",
      nextSynthesis: zh ? "下一条综合" : "Next synthesis",
      noActiveCandidate: zh ? "当前还没有已播种的综合候选。" : "No active synthesis candidate is currently seeded.",
      nextSynthesisHint: zh ? "一旦主题累积出下一条长期判断，它就会出现在这里。" : "The next durable synthesis will appear here once the topic accumulates one.",
      recentDurableSynthesis: zh ? "最近的长期综合" : "Recent durable synthesis",
      noPublishedSynthesis: zh ? "还没有已发布综合。" : "No published synthesis yet.",
      publishedImpactHint: zh
        ? "一旦综合发布，它对正式页面的影响会显示在这里。"
        : "Once a synthesis publishes, its canonical effect will surface here.",
      summaryReady: (count: number) => formatCount(locale, count, "ready", "ready", " 条就绪"),
      summaryInProgress: (count: number) => formatCount(locale, count, "in progress", "in progress", " 条进行中"),
      summaryPublished: (count: number) => formatCount(locale, count, "published", "published", " 条已发布"),
      summaryChangedCanonical: (count: number) =>
        formatCount(locale, count, "changed canonical", "changed canonical", " 条改动了正式页"),
    },
    showcase: {
      officialShowcase: zh ? "官方案例" : "Official showcase",
      renderedArticle: zh ? "渲染文章" : "Rendered article",
      renderedOpenClawArticle: zh ? "渲染后的 OpenClaw 文章。" : "Rendered OpenClaw article.",
      openTopicHome: zh ? "打开主题首页" : "Open topic home",
      exampleIndex: zh ? "案例索引" : "Example index",
      openMarkdownSource: zh ? "打开 Markdown 源文件" : "Open markdown source",
      sourceExcerpts: (count: number) => formatCount(locale, count, "source excerpt", "source excerpts", " 段来源摘录"),
      wikiPages: (count: number) => formatCount(locale, count, "wiki page", "wiki pages", " 个知识页面"),
      titleLead: zh ? "把 OpenClaw 同时看成主题首页、渲染知识库和源文件集合。" : "OpenClaw as topic home, rendered wiki, and source files.",
      openQuestionQueue: zh ? "打开问题队列" : "Open question queue",
      openSessionQueue: zh ? "打开轮次队列" : "Open session queue",
      openExampleIndex: zh ? "打开案例索引" : "Open example index",
      openExampleFiles: zh ? "打开案例文件" : "Open example files",
      openObsidianVault: zh ? "打开 Obsidian Vault" : "Open Obsidian vault",
      startHere: zh ? "从这里开始" : "Start Here",
      startHereDescription: zh ? "打开一个页面，然后继续往下走。" : "Open a page and move on.",
      source: zh ? "源文件" : "Source",
      sourceDescription: zh ? "仓库快捷入口。" : "Repo shortcuts.",
      openRepoExampleFolder: zh ? "打开仓库案例目录" : "Open repo example folder",
      headerTitle: zh ? "OpenClaw 官方案例" : "OpenClaw showcase",
      headerDescriptionArticle: zh ? "阅读渲染后的 OpenClaw 文章。" : "Read the rendered OpenClaw article.",
      headerDescriptionIndex: zh ? "官方 OpenClaw 案例。" : "Official OpenClaw showcase.",
      headerBadge: zh ? "官方案例" : "Official showcase",
      pageTitles: {
        exampleIndex: zh ? "案例索引" : "Example index",
        openclaw: "OpenClaw",
        watchpoints: zh ? "OpenClaw 维护观察点" : "OpenClaw maintenance watchpoints",
        rhythm: zh ? "OpenClaw 维护节奏" : "OpenClaw maintenance rhythm",
        tensions: zh ? "OpenClaw 当前张力" : "OpenClaw current tensions",
        openQuestions: zh ? "OpenClaw 开放问题" : "OpenClaw open questions",
        upgradeNote: zh ? "升级监测笔记" : "Upgrade monitoring note",
      },
      pageNotes: {
        exampleIndex: zh ? "先看渲染案例的精选落地页。" : "Start with the curated landing page for the rendered example.",
        openclaw: zh ? "由源材料编译出的核心实体页。" : "The core entity page compiled from the source corpus.",
        watchpoints: zh ? "最清楚展示编译式知识库结果的综合页。" : "A synthesis page that shows the compiled-wiki outcome clearly.",
        rhythm: zh ? "用于回看顺序、过期上下文包和下一条综合的日常维护页。" : "The daily maintenance surface for revisit order, stale context packs, and next syntheses.",
        tensions: zh ? "最快看清当前仍不稳定或战略重要内容的入口。" : "The fastest way to see what still feels unstable or strategically important.",
        openQuestions: zh ? "为未解决问题和后续采集保留的长期下一步页面。" : "A durable next-work page for unresolved questions and future source collection.",
        upgradeNote: zh ? "重新回流到知识库中的归档回答页。" : "An archived answer page that re-entered the wiki.",
      },
      open: zh ? "打开" : "Open",
    },
    wikiBrowser: {
      failedToLoadPages: zh ? "加载知识页面失败。" : "Failed to load wiki pages.",
      failedToLoadPage: zh ? "加载知识页面失败。" : "Failed to load wiki page.",
      failedToSavePage: zh ? "保存知识页面失败。" : "Failed to save wiki page.",
      failedToCreatePage: zh ? "创建知识页面失败。" : "Failed to create wiki page.",
      failedToRefreshLinks: zh ? "刷新链接失败。" : "Failed to refresh wiki links.",
      entry: zh ? "条目" : "Entry",
      role: zh ? "角色" : "Role",
      surface: zh ? "表面" : "Surface",
      cadence: zh ? "节奏" : "Cadence",
      coverage: zh ? "覆盖度" : "Coverage",
      revised: zh ? "修订" : "Revised",
      references: zh ? "参考来源" : "References",
      relatedPages: zh ? "关联页面" : "Related pages",
      pages: zh ? "页面" : "Pages",
      new: zh ? "新建" : "New",
      workspace: zh ? "工作区" : "Workspace",
      createFromTemplate: zh ? "从模板创建" : "Create from template",
      newPageTitle: zh ? "新页面标题" : "New page title",
      create: zh ? "创建" : "Create",
      cancel: zh ? "取消" : "Cancel",
      loadingPages: zh ? "正在加载知识页面…" : "Loading wiki pages...",
      noPages: zh ? "还没有发现知识页面。" : "No wiki pages were discovered yet.",
      noPagesCreateHint: zh ? "先从模板创建第一篇页面，或初始化一个已有内容的工作区。" : "Create the first page from a template or initialize a populated workspace.",
      noPagesBrowseHint: zh ? "加载一个工作区快照后再浏览页面。" : "Load a workspace snapshot to browse pages.",
      unresolved: zh ? "未解析" : "unresolved",
      loadingPage: zh ? "正在加载页面…" : "Loading page...",
      selectPage: zh ? "选择一个知识页面。" : "Select a wiki page.",
      pageFallbackDescription: zh ? "知识页面。" : "Wiki page.",
      atAGlance: zh ? "一眼看懂" : "At a glance",
      review: zh ? "评审" : "Review",
      status: zh ? "状态" : "Status",
      sourceRefs: (count: number) => formatCount(locale, count, "source ref", "source refs", " 条来源引用"),
      revisedAt: zh ? "修订于" : "Revised",
      refreshLinks: zh ? "刷新链接" : "Refresh links",
      jumpTo: zh ? "跳转到" : "Jump to",
      saveMarkdown: zh ? "保存 Markdown" : "Save markdown",
      editSource: zh ? "编辑源文件" : "Edit source",
      editingMarkdown: zh
        ? "正在编辑原始 Markdown。Frontmatter 仍会按页面路径校验，保存后的文件仍然是真相层。"
        : "Editing raw Markdown. Frontmatter remains validated against the page path and the saved file stays the source of truth.",
      sourceReferencesForPage: zh ? "这个页面的来源引用。" : "Source references for this page.",
      noSourceReferences: zh ? "这个页面还没有挂接来源引用。" : "No source references have been attached to this article yet.",
      sourceLabel: zh ? "来源" : "Source",
      seeAlso: zh ? "延伸阅读" : "See also",
      backlinks: zh ? "反向链接" : "Backlinks",
      noBacklinks: zh ? "还没有相关文章反向链接。" : "No related article backlinks yet.",
      linkedConcepts: zh ? "已解析链接" : "Linked concepts",
      noResolvedLinks: zh ? "还没有已解析的概念或关联页面。" : "No resolved linked concepts or related pages yet.",
      openLinkGaps: zh ? "待补链接缺口" : "Open link gaps",
      indexed: zh ? "索引于" : "Indexed",
      aliases: zh ? "别名" : "Aliases",
      refresh: zh ? "刷新条件" : "Refresh",
      nearbyPages: zh ? "附近页面" : "Nearby pages",
      selectPageForNearby: zh ? "选择一个页面后查看附近链接。" : "Select a page to see nearby links.",
      workNext: zh ? "下一步工作" : "Work next",
      noLinkedPages: zh ? "还没有关联页面。" : "No linked pages yet.",
      pageNotes: zh ? "页面备注" : "Page notes",
      path: zh ? "路径" : "Path",
      slug: "Slug",
      wikiBrowser: zh ? "知识浏览器" : "Wiki browser",
      browseWiki: zh ? "浏览知识库" : "Browse the wiki",
      wiki: zh ? "知识库" : "Wiki",
      unknownError: zh ? "发生了未知错误。" : "An unknown error occurred.",
    },
  };
}
