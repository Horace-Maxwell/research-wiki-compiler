<h1 align="center">Research Wiki Compiler</h1>

<p align="center">
  <strong>把原始资料编译成可审阅、可追踪、可长期维护的本地知识工作台。</strong>
  <br />
  <strong>Compile raw material into a local knowledge workspace that stays reviewable, traceable, and durable.</strong>
</p>

<p align="center">
  local-first / review-first / wiki-first / small-context knowledge work
</p>

<p align="center">
  <a href="./MAINTAIN_THIS_REPO.md">Maintain This Repo / 维护仓库</a>
  ·
  <a href="./MAINTAIN_SHOWCASE.md">Maintain Showcase / 维护 Showcase</a>
  ·
  <a href="./ROUTING_REGRESSION_GUARD.md">Routing Guard / 路由守卫</a>
  ·
  <a href="./FIRST_RUN_CHECKLIST.md">First Run / 首次运行</a>
  ·
  <a href="./TRY_THIS_PRODUCT.md">Try This Product / 试用产品</a>
  ·
  <a href="./OPENCLAW_WALKTHROUGH.md">OpenClaw Walkthrough / OpenClaw 导览</a>
  ·
  <a href="./RELEASE_CHECKLIST.md">Release Checklist / 发布清单</a>
  ·
  <a href="./docs/official-showcase.md">Official Showcase / 官方案例</a>
  ·
  <a href="./examples/openclaw-wiki/README.md">OpenClaw Showcase / OpenClaw 案例</a>
  ·
  <a href="./MANUAL_QA.md">Manual QA / 手动验证</a>
  ·
  <a href="./docs/topic-bootstrap.md">Topic Bootstrap / 主题模板</a>
  ·
  <a href="./SUPPORT.md">Support / 支持</a>
</p>

## What This Product Is / 这是什么产品

Research Wiki Compiler is a local-first product for compact, durable knowledge work. It turns sources into visible summaries, reviewable changes, bounded research questions, resumable sessions, durable syntheses, and a Markdown wiki that remains the source of truth.  
Research Wiki Compiler 是一个面向紧凑、可持续知识工作的本地优先产品。它把原始资料转成可见 summary、可审阅变更、有边界的问题、可继续的 session、可沉淀的 synthesis，以及最终仍以 Markdown 为真相层的 wiki。

This is not “chat with files.” The point is to keep working memory small, keep evidence visible, and keep good output durable.  
这不是“拿文件去聊天”。它的核心是让工作记忆保持小而高信号、让证据保持可见、让高价值结果沉淀成可复用的长期资产。

## Quickstart / 快速开始

### 1. Install / 安装

```bash
npm install
npm run env:check
```

Requirements: Node.js 20+, npm.  
环境要求：Node.js 20+、npm。

`npm run env:check` verifies the local repo has the committed demo data, the OpenClaw showcase snapshot, the verified-path contract, and writable runtime folders.  
`npm run env:check` 会检查本地仓库是否包含提交好的 demo 数据、OpenClaw showcase 快照、已验证路径合约，以及可写的运行目录。

It also confirms the verified browser path is present by checking Playwright Chromium and the compact machine-readable contract at [verified-path.json](./verified-path.json).  
它也会检查正式浏览器验证路径是否存在：包括 Playwright Chromium，以及紧凑的机器可读合约 [verified-path.json](./verified-path.json)。

### 2. Prepare local data / 准备本地数据

```bash
npm run demo:reset
npm run showcase:openclaw
```

What this does:  
这两条命令会做这些事：

- `demo:reset`: rebuild the default local demo workspace used by `/dashboard`.  
  `demo:reset`：重建 `/dashboard` 默认使用的本地 demo workspace。
- `showcase:openclaw`: run the official reference showcase path end to end.  
  `showcase:openclaw`：完整跑一遍官方 reference showcase 路径。
- No API key is required for the reference showcase.  
  reference showcase 不需要 API key。

### 3. Launch the app / 启动应用

```bash
npm run dev
```

Open the local URL printed by Next. In most environments it is `http://localhost:3000/topics`.  
打开 Next 打印出来的本地地址。大多数环境里会是 `http://localhost:3000/topics`。

### 4. Take the shortest product path / 走最短产品路径

Open these routes in order:  
按这个顺序打开：

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`
6. `/examples/openclaw`

That path shows the front door, the topic cockpit, the next question, the next bounded work unit, the durable synthesis lane, and the rendered showcase.  
这条路径会依次展示：产品前门、topic 驾驶舱、下一个问题、下一个有边界的工作单元、可沉淀的 synthesis 路径，以及最终渲染出来的 showcase。

## AI Maintainer Start Here / AI 维护从这里开始

If you are another AI taking over this repo, start with the compact maintenance context instead of reading the whole tree.  
如果你是来接手这个仓库的另一个 AI，先读紧凑维护上下文，而不是通读整棵目录树。

Machine-readable trust boundary: [verified-path.json](./verified-path.json).  
机器可读的信任边界： [verified-path.json](./verified-path.json)。

Agent-oriented entrypoint: [AGENTS.md](./AGENTS.md).  
面向 AI 维护者的入口： [AGENTS.md](./AGENTS.md)。

Read these first:  
先读这些：

1. [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md)
2. [MAINTAIN_SHOWCASE.md](./MAINTAIN_SHOWCASE.md)
3. [ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md)
4. [docs/official-showcase.md](./docs/official-showcase.md)
5. [examples/openclaw-wiki/README.md](./examples/openclaw-wiki/README.md)
6. [MANUAL_QA.md](./MANUAL_QA.md)

That set defines the official showcase, the canonical truth layers, the generated layers, the route-safety contract, and the mandatory validation loop.  
这组文件定义了官方 showcase、canonical 真相层、派生层、路由安全合约，以及强制验证循环。

## Support / Verification Matrix / 支持与验证矩阵

This repo now distinguishes between verified, partially verified, and not-yet-certified environments.  
这个仓库现在会明确区分：已验证、部分验证、尚未完整认证的环境。

For the compact machine-readable version of the same contract, see [verified-path.json](./verified-path.json).  
如果你要看同一份边界的紧凑机器可读版本，请看 [verified-path.json](./verified-path.json)。

Official verified path today:  
当前官方已验证路径：

- macOS 15.5 on Apple Silicon (`arm64`)
- Node.js `25.6.1` on this machine, with repository minimum `20+`
- Playwright Chromium for browser regression checks
- English and Chinese UI modes
- OpenClaw reference showcase path and the main product routes

Partially verified:  
部分验证：

- other desktop UNIX-like environments with Node.js 20+ and Playwright Chromium
- manual use in other Chromium-based browsers
- live provider-backed runs

Not yet fully certified:  
尚未完整认证：

- Windows
- Linux
- Safari / Firefox
- mobile browsers

See [SUPPORT.md](./SUPPORT.md) for the full matrix, override env vars, and the official supported path versus best-effort path.  
完整矩阵、端口覆盖变量，以及“官方支持路径”和“best-effort 路径”的区别，请看 [SUPPORT.md](./SUPPORT.md)。

## Shortest Start Path / 最短上手路径

If you only want one copy-paste block, use this:  
如果你只想要一段可以直接复制的最短命令，用这段：

```bash
npm install
npm run env:check
npm run demo:reset
npm run showcase:openclaw
npm run dev
```

Then open:  
然后打开：

- `/topics`
- `/topics/openclaw`
- `/questions?topic=openclaw`
- `/sessions?topic=openclaw`
- `/syntheses?topic=openclaw`
- `/examples/openclaw`

## First Run, Trial, And Demo Guides / 首次运行、试用与演示指南

Use these compact guides instead of reading the whole repo:  
先看这些紧凑指南，而不是通读整个仓库：

- [FIRST_RUN_CHECKLIST.md](./FIRST_RUN_CHECKLIST.md): fastest successful local first impression  
  [FIRST_RUN_CHECKLIST.md](./FIRST_RUN_CHECKLIST.md)：最快得到良好首印象的本地路径
- [TRY_THIS_PRODUCT.md](./TRY_THIS_PRODUCT.md): short external-facing trial guide  
  [TRY_THIS_PRODUCT.md](./TRY_THIS_PRODUCT.md)：最短的对外试用指南
- [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md): fixed bilingual demo script for the official showcase  
  [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md)：官方 showcase 的固定双语演示脚本
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md): release/demo readiness gate  
  [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)：发布或演示前的就绪门槛

## Official Showcase / 官方案例

OpenClaw is the official showcase for this repository.  
OpenClaw 是这个仓库的官方代表案例。

Why OpenClaw:  
为什么选 OpenClaw：

- It already proves the full chain: source -> summary -> question -> session -> synthesis -> wiki.  
  它已经完整证明了整条链路：source -> summary -> question -> session -> synthesis -> wiki。
- It also shows the supporting lanes honestly: gaps, changes, acquisition, and monitoring.  
  它也能诚实展示 supporting lanes：gaps、changes、acquisition、monitoring。
- It has three aligned surfaces over the same knowledge base: rendered app, canonical Markdown wiki, and Obsidian vault.  
  它把同一套知识库同时投射成三种对齐表面：渲染后的 app、canonical Markdown wiki、Obsidian vault。
- It is reproducible in reference mode and useful in live mode.  
  它在 reference mode 下可复现，在 live mode 下可真实使用。

Start here if you want to explain the product to someone else quickly:  
如果你要最快向别人解释这个产品，就从这里开始：

- [docs/official-showcase.md](./docs/official-showcase.md)
- [examples/openclaw-wiki/README.md](./examples/openclaw-wiki/README.md)
- `/topics -> /topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw`

## How To Use The Product / 怎么使用这套产品

### Topic home / topic home 怎么用

Use topic home as the working cockpit, not as a page to read top to bottom.  
把 topic home 当成工作驾驶舱，而不是一页从头读到尾的说明页。

- Look for the next question first.  
  先看下一个 question。
- Then check the next session.  
  再看下一个 session。
- Then see what is closest to synthesis.  
  再看什么最接近 synthesis。
- Only open blockers or signals if they affect the next action.  
  只有当 blocker 或 signal 影响下一步时，再打开它们。

### Question -> Session -> Synthesis / 问题 -> 研究轮次 -> 综合判断

This is the main daily path.  
这是默认的日常主路径。

- `Questions`: choose the next high-value problem and the smallest useful context pack.  
  `Questions`：选择下一个高价值问题，以及最小但足够的上下文包。
- `Sessions`: turn that problem into one bounded pass of work.  
  `Sessions`：把问题变成一次有边界的工作轮次。
- `Syntheses`: promote finished work into durable judgment.  
  `Syntheses`：把完成的工作提升成可长期复用的判断。

### Supporting lanes / supporting lanes 什么时候打开

Supporting lanes exist to unblock the main path, not to replace it.  
supporting lanes 的作用是给主路径排障，而不是替代主路径。

- `Gaps`: open when evidence is missing.  
  `Gaps`：当证据缺失时再看。
- `Changes`: open when a topic is shifting under you.  
  `Changes`：当主题事实正在变化时再看。
- `Acquisition`: open when you know what source to collect next.  
  `Acquisition`：当你已经知道下一步该补什么材料时再看。
- `Monitoring`: open when you need a watchlist, not when you need to think through the topic.  
  `Monitoring`：当你需要 watchlist 时再看，而不是当你需要理解主题时。

### Wiki / Vault / App relationship / wiki、vault、app 的关系

They are not three separate truths.  
它们不是三套不同的真相。

- The app is the working product surface.  
  app 是工作中的产品表面。
- `workspace/wiki/` is the canonical durable layer.  
  `workspace/wiki/` 是 canonical 的长期层。
- `obsidian-vault/` is a projection optimized for local reading and small context assembly.  
  `obsidian-vault/` 是为本地阅读和小上下文组装优化出来的投影视图。

## Karpathy-Style Knowledge Work Fit / 与 Karpathy 风格知识工作的对齐

This repository is strongest when used as a compact working-memory system.  
这个仓库最强的使用方式，是把它当成一个紧凑的工作记忆系统。

What that means here:  
这里具体意味着：

- prefer small context packs over giant dumps  
  优先用小型 context pack，而不是把所有材料一次性塞进去
- keep the next action explicit  
  让“下一步做什么”始终明确
- turn good work into durable notes and syntheses  
  把高价值工作沉淀成 durable note 和 synthesis
- keep evidence close to each judgment  
  让证据始终贴近结论
- treat the wiki as working memory that improves over time  
  把 wiki 当成会持续变好的 working memory

The product is not trying to maximize abstraction. It is trying to help one person think clearly with a small, reusable, reviewable context bundle.  
这个产品不是为了最大化抽象层级，而是为了帮助一个人用小而可复用、可审阅的上下文包更清楚地思考。

## Commands / 常用命令

### Safe first-run path / 安全首跑路径

```bash
npm install
npm run env:check
npm run demo:reset
npm run showcase:openclaw
npm run dev
```

### Daily development / 日常开发

```bash
npm run dev
npm run verify:fast
```

### Route verification / 路由验证

```bash
npm run test:e2e:navigation
npm run verify:routes
```

`npm run test:e2e:navigation` is the real-browser delayed-click regression test for dashboard, settings, the main OpenClaw path, internal example article links, and language persistence.  
`npm run test:e2e:navigation` 是真实浏览器里的延迟点击回归测试，会覆盖 dashboard、settings、OpenClaw 主路径、案例内部文章链接，以及语言持久化。

`npm run verify:routes` starts a production server, opens the official showcase path, and checks for stale `pagePath` or `.html` href regressions.  
`npm run verify:routes` 会启动生产形态服务、打开官方 showcase 路径，并检查是否回归出陈旧的 `pagePath` 或 `.html` href。

### Canonical local hardening path / 标准本地加固路径

```bash
npm run verify:local
```

Run this before closing a maintenance change.  
在结束一次维护改动前，跑这条命令。

It is the shortest single-command upkeep path for env sanity, lint, tests, build, showcase validation, and route safety.  
这是最短的一条单命令维护路径，会同时检查环境健康、lint、测试、build、showcase 验证、生产路由安全和浏览器导航回归。

### Full repeated-run release path / 完整 repeated-run 发布路径

```bash
npm run verify:full
```

Use this before claiming release/demo readiness on the verified path.  
如果你要在“已验证路径”上宣布可以发布或演示，请先跑这条。

It resets demo state, rebuilds the official showcase, and reruns the full local verification chain.  
它会重置 demo 状态、重建官方 showcase，然后把完整本地验证链再跑一遍。

### Showcase reproduction / showcase 重现

```bash
npm run example:openclaw:reset
npm run example:openclaw:build
npm run example:openclaw:validate
npm run example:openclaw:evaluate
```

### One-command showcase path / 一条命令跑 showcase

```bash
npm run showcase:openclaw
```

### Live provider-backed showcase / 真实 provider 的 live showcase

```bash
cp .env.example .env.local
# add OPENAI_API_KEY
npm run example:openclaw:live
```

Live mode is optional. Reference mode is the official reproducible path.  
live mode 是可选的。reference mode 才是官方可复现路径。

## Validation / 验证

Use this if you want a hardening pass on a local machine:  
如果你想在本地机器上做一次完整 hardening 验证，用这条：

```bash
npm run verify:local
```

That path runs:  
这条命令会跑：

- environment check / 环境检查
- lint
- test
- build
- OpenClaw reference validation / OpenClaw reference 验证
- production showcase route verification / 生产形态 showcase 路由验证
- browser navigation regression / 浏览器导航回归

For a faster inner loop, use `npm run verify:fast`. For the release-style repeated-run path, use `npm run verify:full`.  
如果你要更快的内循环，用 `npm run verify:fast`。如果你要接近发布前的 repeated-run 路径，用 `npm run verify:full`。

Port override helpers:  
端口覆盖辅助变量：

- `PLAYWRIGHT_PORT` or `PLAYWRIGHT_BASE_URL` for `npm run test:e2e:navigation`
- `VERIFY_ROUTES_PORT` or `VERIFY_ROUTES_BASE_URL` for `npm run verify:routes`

For manual browser checks, see [MANUAL_QA.md](./MANUAL_QA.md).  
需要手动浏览器检查时，看 [MANUAL_QA.md](./MANUAL_QA.md)。

## Known Limitation / 已知限制

`npm audit` currently reports one remaining moderate dev-only advisory chain from `drizzle-kit -> @esbuild-kit/* -> esbuild`.  
`npm audit` 目前还会报告一条剩余的中等级、仅限开发工具链的告警链：`drizzle-kit -> @esbuild-kit/* -> esbuild`。

It affects schema tooling, not the shipped Next.js runtime or the official reference showcase path. Keep it documented, avoid treating it as a runtime bug, and revisit it when upstream ships a clean fix.  
它影响的是 schema 工具链，不影响已交付的 Next.js 运行时，也不影响官方 reference showcase 路径。请把它记录清楚，不要把它误判成运行时缺陷，并在上游给出干净修复后再回来看。

## Troubleshooting / 故障排查

### The app opens but a showcase route looks empty / 应用能打开，但 showcase 路线看起来是空的

Open `/topics/openclaw` or `/examples/openclaw` once and let the route finish loading. The rendered showcase workspace is rebuilt automatically from the committed snapshot when needed.  
先打开一次 `/topics/openclaw` 或 `/examples/openclaw`，等页面加载完成。需要时，渲染用的 showcase workspace 会根据仓库里提交好的快照自动重建。

### I want live LLM output / 我想跑真实 LLM 输出

Set `OPENAI_API_KEY` in `.env.local`, then use `npm run example:openclaw:live`.  
在 `.env.local` 中设置 `OPENAI_API_KEY`，然后运行 `npm run example:openclaw:live`。

### I changed workspaces and the browser feels stale / 我切过 workspace 后浏览器感觉状态不对

Open `/dashboard` and pick the correct workspace again, or clear browser local storage for the app.  
打开 `/dashboard`，重新选择正确的 workspace；如果还不对，就清理这个应用的浏览器 local storage。

### I only want the shortest demo / 我只想跑最短 demo

Run `npm run showcase:openclaw`, then open `/topics` and follow the main path.  
运行 `npm run showcase:openclaw`，然后打开 `/topics`，按主路径往下走。

### I am maintaining the repo as another AI / 我是来维护仓库的另一个 AI

Read [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md) first, then use [MAINTAIN_SHOWCASE.md](./MAINTAIN_SHOWCASE.md) for showcase work and [ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md) for any routing-sensitive change.  
先读 [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md)，然后在处理 showcase 时看 [MAINTAIN_SHOWCASE.md](./MAINTAIN_SHOWCASE.md)，在处理 routing 敏感改动时看 [ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md)。

If route clicks start behaving like file downloads, run `npm run verify:routes` immediately and treat that as a blocking regression.  
如果路由点击开始像文件下载一样工作，立刻运行 `npm run verify:routes`，并把它当成阻塞级回归。

## Repository Map / 仓库地图

- [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md): the shortest repo takeover playbook for future AI maintainers  
  [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md)：给未来 AI 维护者看的最短仓库接管手册
- [MAINTAIN_SHOWCASE.md](./MAINTAIN_SHOWCASE.md): the upkeep playbook for the official OpenClaw showcase  
  [MAINTAIN_SHOWCASE.md](./MAINTAIN_SHOWCASE.md)：官方 OpenClaw showcase 的维护手册
- [ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md): the explicit guard against HTML-download and file-like route regressions  
  [ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md)：防止 HTML 下载和文件式路由回归的显式守卫
- [FIRST_RUN_CHECKLIST.md](./FIRST_RUN_CHECKLIST.md): the shortest first-use checklist  
  [FIRST_RUN_CHECKLIST.md](./FIRST_RUN_CHECKLIST.md)：最短的首次使用清单
- [TRY_THIS_PRODUCT.md](./TRY_THIS_PRODUCT.md): the shortest external trial guide  
  [TRY_THIS_PRODUCT.md](./TRY_THIS_PRODUCT.md)：最短的对外试用指南
- [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md): the fixed bilingual walkthrough script for demos  
  [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md)：用于演示的固定双语 walkthrough 脚本
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md): the release/demo readiness checklist  
  [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)：发布或演示前的就绪清单
- [docs/official-showcase.md](./docs/official-showcase.md): the best external-facing product walkthrough  
  [docs/official-showcase.md](./docs/official-showcase.md)：最适合对外展示的产品 walkthrough
- [examples/openclaw-wiki/README.md](./examples/openclaw-wiki/README.md): the full OpenClaw showcase case  
  [examples/openclaw-wiki/README.md](./examples/openclaw-wiki/README.md)：完整的 OpenClaw showcase 案例
- [docs/topic-bootstrap.md](./docs/topic-bootstrap.md): how to create a new reusable topic  
  [docs/topic-bootstrap.md](./docs/topic-bootstrap.md)：如何创建新的可复用 topic
- [docs/topic-maturity.md](./docs/topic-maturity.md): how topic quality is evaluated  
  [docs/topic-maturity.md](./docs/topic-maturity.md)：topic 质量如何评估
- [docs/architecture.md](./docs/architecture.md): lower-level system design notes  
  [docs/architecture.md](./docs/architecture.md)：更底层的系统设计说明

## License / 许可证

Apache-2.0
