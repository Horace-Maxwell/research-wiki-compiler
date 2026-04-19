# Maintain Showcase / 维护 Showcase

Read this if you are maintaining the official showcase.  
如果你在维护官方 showcase，就读这份文件。

Compact support boundary: `verified-path.json`.  
紧凑支持边界：`verified-path.json`。

## Official Showcase / 官方 Showcase

- Official showcase: OpenClaw  
  官方 showcase：OpenClaw
- Why it is the flagship:
  it proves source -> summary -> question -> session -> synthesis -> wiki, and it aligns the app, wiki, and vault around one topic.  
  为什么它是旗舰案例：它证明了 source -> summary -> question -> session -> synthesis -> wiki 的完整链路，并让 app、wiki、vault 围绕同一主题对齐。

## What Must Stay True / 什么必须继续成立

- `/topics -> /topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw` still works  
  `/topics -> /topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw` 这条路径必须继续正常工作
- the committed wiki remains the showcase truth layer  
  已提交的 wiki 必须继续是 showcase 真相层
- the rendered showcase still reflects the committed showcase snapshot  
  渲染后的 showcase 必须继续反映已提交的 showcase snapshot
- docs still point to the real official showcase commands and routes  
  文档必须继续指向真实可用的官方 showcase 命令和路由
- no main-path link regresses into file-like or download-like navigation  
  主路径链接绝不能回归为文件式或下载式导航

## Canonical Showcase Artifacts / Showcase 的 Canonical 产物

- `examples/openclaw-wiki/workspace/wiki/`
- `examples/openclaw-wiki/workspace/`
- `examples/openclaw-wiki/manifest.json`
- `examples/openclaw-wiki/pipeline.json`

  这些文件和目录定义了 showcase 的正式参考状态。  
  These files and directories define the official reference state of the showcase.

## Generated Or Projected Showcase Artifacts / Showcase 的生成或投影视图产物

- `tmp/rendered-examples/openclaw/`
- `examples/openclaw-wiki/obsidian-vault/`
- `examples/openclaw-wiki/evaluation/`
- `examples/openclaw-wiki/reference-baseline.json`

  这些是运行时、投影或验证产物，应优先通过脚本刷新。  
  These are runtime, projected, or validation artifacts and should usually be refreshed through scripts.

Rule: do not treat `tmp/rendered-examples/openclaw/` as durable truth.  
规则：不要把 `tmp/rendered-examples/openclaw/` 当成长期真相。

## Commands / 命令

### Rebuild and validate the showcase / 重建并验证 showcase

```bash
npm run example:openclaw:reset
npm run example:openclaw:build
npm run example:openclaw:validate
npm run example:openclaw:evaluate
npm run verify:routes
```

### One-command official showcase path / 一条命令跑官方 showcase

```bash
npm run showcase:openclaw
```

## Verified Boundary Vs Best-Effort / 已验证边界与 Best-Effort

Verified today:  
今天已经验证的部分：

- reference-mode OpenClaw rebuilds
- `/topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw`
- English and Chinese UI over that route path
- `npm run example:openclaw:validate`
- `npm run verify:routes`
- `npm run test:e2e:navigation`

Best-effort today:  
今天仍属于 best-effort 的部分：

- live-mode provider output
- browsers outside the verified Chromium path
- operating systems outside the verified local macOS path

## Routes That Must Still Work / 必须继续正常工作的路由

- `/topics`
- `/topics/openclaw`
- `/questions?topic=openclaw`
- `/sessions?topic=openclaw`
- `/syntheses?topic=openclaw`
- `/examples/openclaw`

## Docs That Must Stay Aligned / 必须保持对齐的文档

- `README.md`
- `docs/official-showcase.md`
- `examples/openclaw-wiki/README.md`
- `MANUAL_QA.md`

If the commands or routes change, update these docs after the real path passes again.  
如果命令或路由变化了，先让真实路径重新通过，再更新这些文档。

## Acceptable Update Vs Regression / 可接受更新与回归

### Acceptable / 可接受

- intentional showcase rebuilds that update evaluation timestamps or scores  
  有意重建 showcase 后带来的 evaluation 时间戳或分数变化
- intentional canonical wiki improvements that are followed by a clean rebuild  
  对 canonical wiki 的有意改进，且之后进行了干净重建
- live-mode output differences from provider-backed runs  
  provider 驱动的 live 模式输出差异

### Regression / 回归

- showcase route is stale, empty, or inconsistent with the committed wiki  
  showcase 路由过期、空白，或和已提交 wiki 不一致
- validation fails  
  验证失败
- route verification reports `pagePath`, `.html`, or download events  
  路由验证报告里出现 `pagePath`、`.html` 或下载事件
- docs describe commands that no longer work  
  文档描述了已经失效的命令
- the showcase stops telling the core product story clearly  
  showcase 不再清楚表达产品核心故事

## Detecting Stale Showcase State / 识别过期的 Showcase 状态

Suspect stale state if:  
如果出现这些情况，就怀疑 showcase 状态过期：

- `/examples/openclaw` looks empty or out of date
- the app route and committed wiki disagree
- the runtime workspace under `tmp/rendered-examples/openclaw/` has not refreshed after a showcase rebuild

Safe refresh path:  
安全刷新路径：

```bash
npm run example:openclaw:reset
npm run showcase:openclaw
```

Then reopen the official route path.  
然后重新打开官方路由路径。

## Safe Showcase Maintenance Loop / 安全维护 Showcase 的循环

1. Read this file plus `ROUTING_REGRESSION_GUARD.md`.  
   先读这份文件和 `ROUTING_REGRESSION_GUARD.md`。
2. Rebuild or refresh the showcase.  
   重建或刷新 showcase。
3. Validate the committed example.  
   验证提交进仓库的 example。
4. Check the official route path.  
   检查官方路由路径。
5. Update docs only after the real showcase is healthy again.  
   只有在真实 showcase 再次健康后才更新文档。
