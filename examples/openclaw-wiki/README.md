# OpenClaw Official Showcase / OpenClaw 官方案例

This directory is the strongest end-to-end showcase in the repository.  
这个目录是仓库里最强的端到端 showcase。

It is not a throwaway demo folder. It is the committed, reproducible example that aligns the rendered app, the canonical wiki, and the Obsidian vault around one topic.  
它不是一个临时 demo 文件夹，而是一个已经提交进仓库、可复现的官方案例：渲染后的 app、canonical wiki 和 Obsidian vault 都围绕同一个 topic 对齐。

If you are maintaining this showcase as another AI, read [../../MAINTAIN_THIS_REPO.md](../../MAINTAIN_THIS_REPO.md) first and then [../../MAINTAIN_SHOWCASE.md](../../MAINTAIN_SHOWCASE.md).  
如果你是来维护这个 showcase 的另一个 AI，先读 [../../MAINTAIN_THIS_REPO.md](../../MAINTAIN_THIS_REPO.md)，再读 [../../MAINTAIN_SHOWCASE.md](../../MAINTAIN_SHOWCASE.md)。

For the bilingual demo path and narration, use [../../OPENCLAW_WALKTHROUGH.md](../../OPENCLAW_WALKTHROUGH.md).  
需要中英双语的演示路径和讲解脚本时，用 [../../OPENCLAW_WALKTHROUGH.md](../../OPENCLAW_WALKTHROUGH.md)。

## What Lives Here / 这里有什么

- `source-corpus/`: the bounded OpenClaw source set  
  `source-corpus/`：有边界的 OpenClaw 原始语料
- `workspace/`: the committed canonical reference output  
  `workspace/`：提交进仓库的 canonical reference 输出
- `obsidian-vault/`: the Obsidian projection of the same knowledge base  
  `obsidian-vault/`：同一知识库的 Obsidian 投影视图
- `manifest.json`: the canonical manifest  
  `manifest.json`：canonical manifest
- `pipeline.json`: the pipeline contract for the showcase  
  `pipeline.json`：这个 showcase 的 pipeline 合约
- `reference-baseline.json`: the reference hash baseline used for validation  
  `reference-baseline.json`：验证时使用的 reference hash baseline
- `evaluation/`: quality and maturity reports  
  `evaluation/`：质量与成熟度评估报告

## Why This Is The Flagship / 为什么它是旗舰案例

- It proves source -> summary -> question -> session -> synthesis -> wiki.  
  它证明了 source -> summary -> question -> session -> synthesis -> wiki 的完整链路。
- It keeps uncertainty explicit through gaps, changes, acquisition, and monitoring.  
  它通过 gaps、changes、acquisition、monitoring 把不确定性显式保留下来。
- It shows the product as a compact working-memory system instead of a pile of notes.  
  它展示的是一个紧凑的 working-memory 系统，而不是一堆散乱笔记。
- It is reproducible in reference mode and practical in live mode.  
  它在 reference mode 下可复现，在 live mode 下可实际使用。

## Fastest Walkthrough / 最快 walkthrough

### Start in the app / 从 app 开始

Open these routes in order:  
按这个顺序打开：

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`
6. `/examples/openclaw`

### Start in the repository / 从仓库文件开始

Read in this order:  
按这个顺序读：

1. [../../docs/official-showcase.md](../../docs/official-showcase.md)
2. [workspace/wiki/index.md](workspace/wiki/index.md)
3. [workspace/wiki/entities/openclaw.md](workspace/wiki/entities/openclaw.md)
4. [workspace/wiki/syntheses/openclaw-maintenance-rhythm.md](workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
5. [workspace/wiki/notes/openclaw-open-questions.md](workspace/wiki/notes/openclaw-open-questions.md)
6. [obsidian-vault/README.md](obsidian-vault/README.md)

### Start in the canonical wiki / 从 canonical wiki 开始

Inspect these pages first:  
优先看这些页面：

- [workspace/wiki/index.md](workspace/wiki/index.md)
- [workspace/wiki/entities/openclaw.md](workspace/wiki/entities/openclaw.md)
- [workspace/wiki/syntheses/openclaw-current-tensions.md](workspace/wiki/syntheses/openclaw-current-tensions.md)
- [workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md](workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md)
- [workspace/wiki/syntheses/openclaw-maintenance-rhythm.md](workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
- [workspace/wiki/notes/openclaw-open-questions.md](workspace/wiki/notes/openclaw-open-questions.md)

### Start in the Obsidian vault / 从 Obsidian vault 开始

Inspect these notes first:  
优先看这些笔记：

1. [obsidian-vault/README.md](obsidian-vault/README.md)
2. [obsidian-vault/00 Atlas/Start Here.md](obsidian-vault/00%20Atlas/Start%20Here.md)
3. [obsidian-vault/00 Atlas/Topic Map.md](obsidian-vault/00%20Atlas/Topic%20Map.md)
4. [obsidian-vault/05 Context Packs/Upgrade Watchpoints.md](obsidian-vault/05%20Context%20Packs/Upgrade%20Watchpoints.md)
5. [obsidian-vault/05 Context Packs/Maintenance Triage.md](obsidian-vault/05%20Context%20Packs/Maintenance%20Triage.md)

## Official Commands / 官方命令

### Reference mode / reference 模式

```bash
npm install
npm run env:check
npm run example:openclaw:reset
npm run example:openclaw:build
npm run example:openclaw:validate
npm run example:openclaw:evaluate
```

Or use:  
或者直接用：

```bash
npm run showcase:openclaw
npm run verify:routes
```

Reference mode is the official reproducible path.  
reference 模式是官方可复现路径。

It does all of this without requiring a provider key:  
它在不需要 provider key 的前提下完成这些事：

- import
- summarize
- plan reviewable changes
- apply reviewed mutations
- create the final wiki
- project the Obsidian vault
- validate the committed baseline

## Showcase Maintenance Rules / Showcase 维护规则

Treat this directory as a maintained reference case, not as a scratchpad.  
把这个目录当成持续维护的参考案例，而不是临时草稿区。

### Canonical truth inside this example / 这个案例里的 canonical 真相

- `workspace/wiki/` is the durable truth layer  
  `workspace/wiki/` 是长期真相层
- `workspace/` is the committed reference workspace  
  `workspace/` 是提交进仓库的参考 workspace

### Derived or projected layers inside this example / 这个案例里的派生层

- `obsidian-vault/` is the projection for local reading and compact context assembly  
  `obsidian-vault/` 是面向本地阅读和紧凑上下文组装的投影视图
- `evaluation/` and `reference-baseline.json` are validation artifacts that should usually be regenerated, not hand-edited  
  `evaluation/` 和 `reference-baseline.json` 是验证产物，通常应重新生成，而不是手改

### Maintain it safely / 安全维护它

If you changed this showcase intentionally, rerun:  
如果你有意修改了这个 showcase，重新运行：

```bash
npm run example:openclaw:reset
npm run example:openclaw:build
npm run example:openclaw:validate
npm run example:openclaw:evaluate
npm run verify:routes
```

Do not treat files under `tmp/rendered-examples/openclaw/` as durable truth. That runtime copy is rebuilt from the committed showcase snapshot.  
不要把 `tmp/rendered-examples/openclaw/` 下的文件当成长期真相。那个运行时副本会从提交进仓库的 showcase snapshot 重新构建。

### Live mode / live 模式

```bash
cp .env.example .env.local
# set OPENAI_API_KEY
npm run example:openclaw:live
```

Live mode is useful for a real provider-backed run, but it is not expected to match the committed baseline byte for byte.  
live 模式适合真实 provider 驱动的运行，但不承诺与仓库里的 committed baseline 逐字节一致。

## What To Show In A Demo / 演示时最该展示什么

### Best product path / 最强产品路径

- `/topics`
- `/topics/openclaw`
- `/questions?topic=openclaw`
- `/sessions?topic=openclaw`
- `/syntheses?topic=openclaw`

This is the main path that proves the product can guide real work with compact context.  
这条主路径最能证明产品可以用紧凑上下文来推动真实工作。

### Best rendered route / 最强渲染路径

- `/examples/openclaw`

Use this when you want the clearest rendered page experience over the same source-of-truth wiki.  
当你想展示基于同一套 source-of-truth wiki 的最佳渲染体验时，用这个入口。

### Best wiki path / 最强 wiki 路径

- [workspace/wiki/index.md](workspace/wiki/index.md)
- [workspace/wiki/entities/openclaw.md](workspace/wiki/entities/openclaw.md)
- [workspace/wiki/syntheses/openclaw-maintenance-rhythm.md](workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
- [workspace/wiki/notes/openclaw-open-questions.md](workspace/wiki/notes/openclaw-open-questions.md)

### Best vault path / 最强 vault 路径

- [obsidian-vault/00 Atlas/Start Here.md](obsidian-vault/00%20Atlas/Start%20Here.md)
- [obsidian-vault/00 Atlas/Topic Map.md](obsidian-vault/00%20Atlas/Topic%20Map.md)
- [obsidian-vault/05 Context Packs/Upgrade Watchpoints.md](obsidian-vault/05%20Context%20Packs/Upgrade%20Watchpoints.md)

## Why This Matters / 为什么这个案例重要

OpenClaw is the clearest proof that the system is useful for day-to-day thinking, not just for framework presentation.  
OpenClaw 是这套系统对日常思考真正有用、而不只是“框架展示”的最清晰证明。

It shows that the product can:  
它证明这个产品可以：

- keep context small  
  把上下文保持得很小
- keep the next action explicit  
  把下一步动作保持明确
- turn work into durable notes and syntheses  
  把工作沉淀成 durable note 和 synthesis
- keep provenance visible  
  让 provenance 持续可见
- support both app-first and file-first usage  
  同时支持 app-first 和 file-first 两种使用方式

## If You Want To Try It Yourself / 如果你想自己试

Use this shortest local path:  
用这条最短本地路径：

```bash
npm install
npm run env:check
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

If the app is already running and the showcase route looks stale, reload the route once. The rendered workspace auto-syncs from the committed snapshot when needed.  
如果 app 已经在运行且 showcase 路线看起来有点旧，重新加载一次路由即可。需要时，渲染用 workspace 会从仓库里提交好的快照自动同步。
