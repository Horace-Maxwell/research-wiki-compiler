# Research Wiki Compiler

本地优先、文件优先的研究知识编译器，把原始材料编译成可审阅、可追踪、可长期维护的 Markdown Wiki。  
A local-first, file-first research knowledge compiler that turns raw material into a durable, reviewable Markdown wiki.

它不是“上传文件然后聊天”的工具。它把文章、笔记、摘录与研究素材落到本地工作区，生成可见摘要、可审阅提案与可归档答案，并让知识通过 compiled wiki 持续积累。  
This is not an “upload files and chat” tool. It lands articles, notes, excerpts, and research material in a local workspace, produces visible summaries, reviewable proposals, and archivable answers, and lets knowledge compound through a compiled wiki.

- `编译 / Compile`：导入原始材料，做规范化、分块、总结，并生成候选知识更新。  
  Import raw material, normalize it, chunk it, summarize it, and generate candidate knowledge updates.
- `审阅 / Review`：知识变更先成为可审阅 proposal，再进入 wiki。  
  Knowledge mutation becomes a reviewable proposal before it reaches the wiki.
- `提问 / Ask`：回答优先基于 compiled wiki，再回退到 summaries 与 raw chunks。  
  Answers come from the compiled wiki first, then fall back to summaries and raw chunks.
- `归档 / Archive`：把高价值答案回写成 synthesis 或 note 页面。  
  Turn valuable answers back into synthesis or note pages.
- `审计 / Audit`：检查冲突、覆盖缺口、孤立页面、陈旧页面与 unsupported claims。  
  Inspect contradictions, coverage gaps, orphan pages, stale pages, and unsupported claims.

## 为什么它不一样 / Why This Repo Is Different

- 不是一次性的聊天记录，而是会持续维护的 compiled wiki。  
  Not a disposable chat transcript, but a maintained compiled wiki.
- 不是黑盒记忆；prompts、summaries、patch proposals、reviews 与 audits 都是可见文件。  
  Not black-box memory; prompts, summaries, patch proposals, reviews, and audits are visible files.
- 不是无状态的 RAG-style querying；系统先做 wiki-first retrieval，再按需回退。  
  Not stateless RAG-style querying; the system does wiki-first retrieval and only falls back when needed.
- 不是静默自动写作；知识变更默认走 review-first、人类批准的路径。  
  Not silent auto-writing; knowledge mutation follows a review-first, human-approved path by default.
- 不是封闭托管的知识产品；工作区由用户本地拥有，文件才是耐久层。  
  Not a closed hosted knowledge product; the workspace is locally owned, and files are the durable layer.

## 核心流程 / Core Workflow

- `Compile / 编译`：从 `raw/` 接收材料，规范化并生成可见摘要与候选 patch proposal。  
  Receive material in `raw/`, normalize it, and produce visible summaries plus candidate patch proposals.
- `Review / 审阅`：在 `reviews/` 中查看 rationale、citations、diff 与风险级别，再批准、拒绝或编辑后批准。  
  Inspect rationale, citations, diffs, and risk levels in `reviews/`, then approve, reject, or edit-and-approve.
- `Ask / 提问`：先检索 wiki 页面，再看 source summaries，最后才回退到 raw chunks。  
  Retrieve wiki pages first, then source summaries, and only fall back to raw chunks at the end.
- `Archive / 归档`：把可靠答案转成 `wiki/syntheses/` 或 `wiki/notes/` 中的持久页面。  
  Turn reliable answers into durable pages under `wiki/syntheses/` or `wiki/notes/`.
- `Audit / 审计`：把知识库的结构性问题输出为可读报告，而不是隐藏在模型上下文里。  
  Turn structural knowledge-base problems into readable reports instead of hiding them in model context.

## 核心能力 / Key Features

- 工作区初始化会直接创建可见目录结构、SQLite 索引与本地设置文件。  
  Workspace initialization creates the visible directory structure, SQLite index, and local settings files directly.
- Wiki 页面是带 frontmatter 的 Markdown，支持 wikilinks、backlinks 与纯文本编辑。  
  Wiki pages are frontmatter-backed Markdown with wikilinks, backlinks, and plain-text editing.
- Source import、normalization、checksum、chunking 都是确定性的、可检查的。  
  Source import, normalization, checksums, and chunking are deterministic and inspectable.
- Source summaries 同时保存为 Markdown 与 structured JSON artifact。  
  Source summaries are persisted as both Markdown and structured JSON artifacts.
- Patch proposal 以文件和数据库双重形式存在，并支持 section-level apply。  
  Patch proposals exist as both files and database records, and support section-level apply.
- Ask、archive、audit 构成闭环：回答来自 wiki，好的回答回到 wiki，审计持续检查结构质量。  
  Ask, archive, and audit form a loop: answers come from the wiki, good answers go back into it, and audits keep checking structural quality.

## 系统概览 / Architecture at a Glance

这不是“数据库里藏着一切”的产品。工作区文件才是系统的耐久真相；SQLite + Drizzle + FTS5 只是运行时索引与缓存。  
This is not a product where everything disappears into a database. Workspace files are the durable source of truth; SQLite + Drizzle + FTS5 are runtime index and cache layers.

```text
WORKSPACE_ROOT/
  raw/               source inputs, normalized files, summaries
  wiki/              durable compiled knowledge in Markdown
  reviews/           pending / approved / rejected proposals
  audits/            human-readable audit reports
  prompts/           visible prompt templates
  .research-wiki/    settings, SQLite database, caches, runs
```

- `raw/`：原始输入、规范化文本、分块与 summary artifacts。  
  Raw inputs, normalized text, chunks, and summary artifacts.
- `wiki/`：真正被长期维护的 compiled wiki。  
  The compiled wiki that is actually maintained over time.
- `reviews/`：所有知识变更的可审阅历史。  
  The reviewable history of all knowledge mutation.
- `audits/`：对冲突、覆盖与支持度问题的可读报告。  
  Readable reports for contradictions, coverage gaps, and support issues.
- `src/`、`prompts/`、`templates/wiki/`：应用逻辑、提示词与页面模板。  
  `src/`, `prompts/`, and `templates/wiki/` hold the app logic, prompt contracts, and page templates.

## 快速开始 / Quickstart

### 前置要求 / Prerequisites

- Node.js 20+
- npm

### 安装并启动演示 / Install and Run the Demo

```bash
npm install
npm run demo:reset
npm run dev
```

打开 [http://localhost:3000/dashboard](http://localhost:3000/dashboard)。  
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

如果你想重新运行 live summarize、patch planning 或 Ask，请在 Settings 页面配置 OpenAI 或 Anthropic key。演示工作区在 seed 后会主动清空 provider credentials。  
If you want to rerun live summarize, patch planning, or Ask, configure an OpenAI or Anthropic key in Settings. The seeded demo workspace intentionally clears provider credentials after seeding.

### 验证命令 / Verification

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

更完整的浏览器烟雾测试步骤见 [MANUAL_QA.md](MANUAL_QA.md)。  
For a fuller browser smoke pass, see [MANUAL_QA.md](MANUAL_QA.md).

## 快速演示 / Quick Demo

1. 打开 `/dashboard` 查看 workspace 状态、计数与最近活动。  
   Open `/dashboard` to inspect workspace status, counts, and recent activity.
2. 打开 `/wiki` 浏览 compiled wiki，确认它是文件驱动而不是聊天记录。  
   Open `/wiki` and confirm the compiled wiki is file-driven, not a chat transcript.
3. 打开 `/sources` 查看 imported source、normalized text、chunks 与 summary artifacts。  
   Open `/sources` to inspect imported sources, normalized text, chunks, and summary artifacts.
4. 打开 `/reviews`，批准一个 pending proposal，观察 wiki 的精确更新。  
   Open `/reviews`, approve a pending proposal, and watch the wiki update precisely.
5. 打开 `/ask` 查看 seeded grounded answer，并把它 archive 成 note 或 synthesis。  
   Open `/ask`, inspect the seeded grounded answer, and archive it as a note or synthesis.
6. 打开 `/audits` 运行一次 orphan audit，查看可读报告与 findings。  
   Open `/audits`, run an orphan audit, and inspect the readable report and findings.

## 截图 / Screenshots

截图尚未提交到仓库。计划中的截图清单见 [docs/assets/screenshots/README.md](docs/assets/screenshots/README.md)。  
Screenshots are not committed yet. The planned capture list lives in [docs/assets/screenshots/README.md](docs/assets/screenshots/README.md).

建议补齐的截图包括：  
Recommended screenshots to add:

- Dashboard 总览 / Dashboard overview
- Wiki 浏览与编辑 / Wiki browser and editor
- Sources 详情与 summary artifacts / Sources detail with summary artifacts
- Review Queue 与 proposal diff / Review Queue with proposal diffs
- Ask 页面与 archive 控件 / Ask page with archive controls
- Audits 页面与 findings 详情 / Audits page with findings detail

## 当前状态 / Current Status

- 这是一个认真构建的 MVP，不是概念验证或聊天壳。  
  This is a serious MVP, not a proof-of-concept or a chat shell.
- compile、review/apply、ask、archive、audit 端到端闭环已经打通。  
  The compile, review/apply, ask, archive, and audit loops are implemented end to end.
- 产品当前针对单人、本地研究工作流，而不是多人协作或云同步。  
  The product is currently optimized for a solo, local research workflow rather than collaboration or cloud sync.
- live provider-backed flows 需要你自己的 API keys。  
  Live provider-backed flows require your own API keys.
- 检索策略刻意采用结构化页面 + SQLite/FTS，而不是向量数据库。  
  The retrieval strategy intentionally uses structured pages + SQLite/FTS instead of a vector database.
- 仓库当前已公开；代码许可证为 Apache-2.0。  
  The repository is now public and licensed under Apache-2.0.

## 文档与项目健康 / Docs & Project Health

- `产品规格 / Product spec`: [docs/product-spec.md](docs/product-spec.md)
- `架构 / Architecture`: [docs/architecture.md](docs/architecture.md)
- `进度记录 / Progress`: [docs/progress.md](docs/progress.md)
- `关键决策 / Decisions`: [docs/decisions.md](docs/decisions.md)
- `手动 QA / Manual QA`: [MANUAL_QA.md](MANUAL_QA.md)
- `支持 / Support`: [SUPPORT.md](SUPPORT.md)
- `安全 / Security`: [SECURITY.md](SECURITY.md) · `maxwelldhx+security@gmail.com`
- `贡献 / Contributing`: [CONTRIBUTING.md](CONTRIBUTING.md)
- `许可证 / License`: [Apache-2.0](LICENSE)
- `维护者 / Maintainer`: Horace · `@maxwelldhx` · `maxwelldhx@gmail.com`
