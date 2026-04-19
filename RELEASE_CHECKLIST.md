# Release Checklist / 发布检查清单

Use this before calling the repository ready for a demo, external share, or release-candidate handoff.  
在把仓库标记为可演示、可对外分享、或可交付的 release candidate 之前，用这份清单确认。

## Required commands / 必跑命令

```bash
npm install
npm run env:check
npm run demo:reset
npm run showcase:openclaw
npm run verify:local
```

## Runtime sanity / 运行时确认

- `/dashboard` loads and the dashboard `Settings` button opens `/settings`  
  `/dashboard` 能加载，而且 dashboard 上的 `Settings` 按钮会打开 `/settings`
- the dashboard workspace-tools toggle stays separate from routing  
  dashboard 里的 workspace tools 开关与路由行为保持分离
- `/topics -> /topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw` still works  
  `/topics -> /topics/openclaw -> /questions?topic=openclaw -> /sessions?topic=openclaw -> /syntheses?topic=openclaw -> /examples/openclaw` 这条路径仍然正常
- `/settings` loads directly  
  `/settings` 可以直接打开
- language switching works and persists after reload  
  语言切换正常，而且刷新后会保持
- no main-path click downloads HTML  
  主路径点击不会下载 HTML

## Showcase sanity / Showcase 确认

- `npm run example:openclaw:validate` passes  
  `npm run example:openclaw:validate` 通过
- `npm run test:e2e:navigation` passes  
  `npm run test:e2e:navigation` 通过
- `npm run verify:routes` passes  
  `npm run verify:routes` 通过
- the committed wiki, rendered app, and Obsidian vault still align  
  已提交的 wiki、渲染 app、Obsidian vault 仍然对齐

## Bilingual sanity / 双语确认

- English and Chinese both work for the main runtime shell  
  英文和中文都能正常用于主运行时界面
- the official showcase can be followed from docs in both languages  
  官方案例能通过中英双语文档顺利跟下来
- the walkthrough script remains usable for both audiences  
  walkthrough 脚本对中英文听众都可用

## Known limitation / 已知限制

`npm audit` may still report a moderate dev-only advisory chain from `drizzle-kit -> @esbuild-kit/* -> esbuild`.  
`npm audit` 目前可能仍会报告一条中等级、仅限开发工具链的告警链：`drizzle-kit -> @esbuild-kit/* -> esbuild`。

That affects schema tooling, not the shipped runtime or the official showcase route path. Keep it documented until upstream resolves it cleanly.  
这影响的是 schema 工具链，不影响已交付运行时，也不影响官方 showcase 路由路径。在上游给出干净修复前，请持续记录它。
