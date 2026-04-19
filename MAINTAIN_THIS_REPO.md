# Maintain This Repo / 维护这个仓库

Read this first if you are taking over maintenance of this repository.  
如果你要接手维护这个仓库，先读这份文件。

This is the shortest high-signal maintenance playbook.  
这是最短、最高信号的维护操作手册。

## What This Repo Is / 这是什么仓库

- A local-first research workspace product.  
  一个本地优先的研究工作台产品。
- It turns sources into summaries, questions, sessions, syntheses, and a durable Markdown wiki.  
  它把来源材料变成 summaries、questions、sessions、syntheses 和长期可维护的 Markdown wiki。
- The product is strongest when used as a compact working-memory system: small context packs, explicit next action, durable synthesis.  
  这套产品最强的使用方式，是把它当作紧凑工作记忆系统：小 context pack、明确下一步、durable synthesis。

## Read These First / 先读这些

1. `MAINTAIN_THIS_REPO.md`
2. `AGENTS.md`
3. `verified-path.json`
4. `MAINTAIN_SHOWCASE.md`
5. `ROUTING_REGRESSION_GUARD.md`
6. `SUPPORT.md`
7. `README.md`
8. `docs/official-showcase.md`
9. `MANUAL_QA.md`

That set should be enough to resume useful work without rereading the whole repo.  
这组文件应该足以让你在不重读整个仓库的前提下恢复有效工作。

## Main Product Path / 主产品路径

Keep this path healthy:  
保持这条路径健康：

`/topics -> /topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw`

If this path becomes unclear or broken, treat it as a product regression.  
如果这条路径变得模糊或损坏，把它当成产品回归。

## Official Showcase / 官方 Showcase

- Official showcase: OpenClaw  
  官方 showcase：OpenClaw
- Flagship route path: `/topics/openclaw` through `/examples/openclaw`  
  旗舰路由路径：从 `/topics/openclaw` 到 `/examples/openclaw`
- Showcase maintenance rules live in `MAINTAIN_SHOWCASE.md`  
  Showcase 维护规则写在 `MAINTAIN_SHOWCASE.md`

## Canonical Vs Generated / Canonical 与生成层

### Canonical / Canonical

- Product code: `src/`  
  产品代码：`src/`
- Official showcase truth layer: `examples/openclaw-wiki/workspace/wiki/`  
  官方 showcase 真相层：`examples/openclaw-wiki/workspace/wiki/`
- Official showcase committed reference workspace: `examples/openclaw-wiki/workspace/`  
  官方 showcase 已提交的参考 workspace：`examples/openclaw-wiki/workspace/`
- Topic truth layers: `topics/*/workspace/wiki/`  
  Topic 真相层：`topics/*/workspace/wiki/`
- Maintainer-facing docs: `README.md`, `MAINTAIN_THIS_REPO.md`, `MAINTAIN_SHOWCASE.md`, `ROUTING_REGRESSION_GUARD.md`, `MANUAL_QA.md`  
  面向维护者的文档：`README.md`、`MAINTAIN_THIS_REPO.md`、`MAINTAIN_SHOWCASE.md`、`ROUTING_REGRESSION_GUARD.md`、`MANUAL_QA.md`

### Generated or projected / 生成或投影视图

- Rendered OpenClaw runtime workspace: `tmp/rendered-examples/openclaw/`  
  OpenClaw 运行时渲染 workspace：`tmp/rendered-examples/openclaw/`
- Rendered topic workspaces: `tmp/rendered-topics/*`  
  渲染后的 topic workspaces：`tmp/rendered-topics/*`
- OpenClaw Obsidian projection: `examples/openclaw-wiki/obsidian-vault/`  
  OpenClaw 的 Obsidian 投影视图：`examples/openclaw-wiki/obsidian-vault/`
- Evaluation and validation outputs: `examples/openclaw-wiki/evaluation/`, `reference-baseline.json`  
  评估与验证输出：`examples/openclaw-wiki/evaluation/`、`reference-baseline.json`

Rule: prefer regenerating generated layers through scripts instead of hand-editing them.  
规则：优先通过脚本重新生成生成层，而不是直接手改。

## Default Maintenance Commands / 默认维护命令

### Fresh machine or reset / 新机器或重置

```bash
npm install
npm run env:check
npm run demo:reset
npm run showcase:openclaw
npm run dev
```

### Before you finish a change / 在结束改动前

```bash
npm run verify:local
```

`verify:local` is the canonical maintenance check.  
`verify:local` 是标准维护检查。

`env:check` now also confirms the machine-readable verified path and the Playwright Chromium binary used by the official browser checks.  
`env:check` 现在也会确认机器可读 verified path，以及官方浏览器验证所依赖的 Playwright Chromium 二进制。

It covers:  
它覆盖：

- env sanity
- lint
- test
- build
- showcase validation
- route safety verification

### Faster inner loop / 更快的内循环

```bash
npm run verify:fast
```

Use this while iterating locally.  
本地迭代时用这条。

### Release-style repeated-run loop / 接近发布前的 repeated-run 循环

```bash
npm run verify:full
```

Use this when you need to prove the official path still survives reset -> rebuild -> revalidate.  
当你需要证明“重置 -> 重建 -> 再验证”的官方路径仍然成立时，用这条。

## What Not To Change Casually / 不要随意改这些

- Main-path routing and link generation
- Showcase truth layers under `examples/openclaw-wiki/workspace/`
- Docs that define commands or official routes
- Route-normalization logic for wiki links
- Anything that would reintroduce raw file-style navigation

  不要随意改：主路径 routing 与链接生成、`examples/openclaw-wiki/workspace/` 下的 showcase 真相层、定义命令或官方路由的文档、wiki 链接归一化逻辑，以及任何可能重新引入文件式导航的改动。

If you touch routing or wiki-link logic, read `ROUTING_REGRESSION_GUARD.md` first.  
如果你要改 routing 或 wiki-link 逻辑，先读 `ROUTING_REGRESSION_GUARD.md`。

## Highest-Risk Regressions / 最高风险回归

- Main-path buttons or links download HTML
- `pagePath` or `.html` hrefs reappear in app routes
- Showcase route and committed wiki drift apart
- Docs drift away from the real commands
- Topic home stops functioning as a cockpit for the next action

  最高风险回归包括：主路径按钮或链接开始下载 HTML、`pagePath` 或 `.html` href 重新出现在 app 路由中、showcase 路由和已提交 wiki 失去对齐、文档与真实命令漂移、以及 topic home 不再像驾驶舱一样服务下一步动作。

## Default Maintenance Loop / 默认维护循环

1. Read this file and the showcase/routing playbooks.  
   先读这份文件以及 showcase/routing playbook。
2. Run `npm run env:check`.  
   运行 `npm run env:check`。
3. Refresh demo/showcase state if needed with `npm run demo:reset` and `npm run showcase:openclaw`.  
   如果需要，用 `npm run demo:reset` 和 `npm run showcase:openclaw` 刷新 demo/showcase 状态。
4. Make the smallest safe change.  
   做最小且安全的改动。
5. Run `npm run verify:local`.  
   运行 `npm run verify:local`。
6. If you touched routing or showcase sync, re-open the official product path manually.  
   如果你改了 routing 或 showcase sync，再手动重新打开官方产品路径。

## Keep The Product Shape Stable / 保持产品形态稳定

- Keep `/topics` as the front door.  
  保持 `/topics` 是前门。
- Keep topic home as a cockpit, not a dashboard essay.  
  保持 topic home 是驾驶舱，而不是分析型 dashboard。
- Keep question -> session -> synthesis as the daily path.  
  保持 question -> session -> synthesis 是日常主路径。
- Keep working memory compact and explicit.  
  保持工作记忆紧凑且明确。

If you need one sentence to resume safely:  
如果你只需要一句恢复提示：

> Preserve the main path, treat `workspace/wiki/` as truth, regenerate projections instead of patching them, and finish with `npm run verify:local`.
