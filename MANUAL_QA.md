# Manual QA / 手动验证

Use this checklist for a final browser smoke pass.  
用这份清单做最终浏览器烟雾验证。

If you are another AI maintaining this repository, pair this file with [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md) and [ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md).  
如果你是来维护这个仓库的另一个 AI，请把这份清单和 [MAINTAIN_THIS_REPO.md](./MAINTAIN_THIS_REPO.md)、[ROUTING_REGRESSION_GUARD.md](./ROUTING_REGRESSION_GUARD.md) 一起使用。

For the honest support boundary, read [SUPPORT.md](./SUPPORT.md) before claiming anything outside the verified path.  
如果你要对“支持范围”做判断，先看 [SUPPORT.md](./SUPPORT.md)，不要超出已验证边界做承诺。

For the fixed demo script, see [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md).  
需要固定演示脚本时，看 [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md)。

## Prerequisites / 前置条件

- Node.js 20+
- `npm install`
- `npm run demo:reset`
- `npm run showcase:openclaw`
- `npm run dev`

Optional for live provider-backed runs: configure `OPENAI_API_KEY` and use the Settings page.  
如果要跑真实 provider 驱动流程：配置 `OPENAI_API_KEY`，并在 Settings 页面中设置。

## Routes To Open / 要打开的路线

### Core product path / 核心产品路径

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`
6. `/examples/openclaw`
7. `/settings`

Confirm:  
确认：

- topic selection is clear  
  topic 选择很清楚
- topic home foregrounds the next action  
  topic home 把下一步动作放在前面
- question, session, and synthesis routes all navigate normally  
  question、session、synthesis 路由都能正常跳转
- the rendered showcase route loads without missing data  
  渲染 showcase 路由加载正常，没有缺数据

### Dashboard path / Dashboard 路径

1. `/dashboard`
2. `/wiki`
3. `/reviews`
4. `/audits`

Confirm:  
确认：

- the demo workspace is initialized  
  demo workspace 已初始化
- wiki pages are visible  
  wiki 页面可见
- review and audit surfaces load without missing workspace state  
  review 和 audit 页面没有 workspace 状态丢失问题

## Navigation Checks / 导航检查

For the main CTAs and sidebar links, verify all of the following:  
对主要 CTA 和侧边栏链接，确认这些事情都成立：

- immediate click works  
  页面刚打开时点击正常
- delayed click works after waiting on the page  
  等待一段时间后点击仍然正常
- click works after navigating away and back  
  跳转走再回来后点击仍然正常
- no route downloads HTML  
  不会下载 HTML 文件
- no stale `pagePath` or `.html` href appears  
  不会出现陈旧的 `pagePath` 或 `.html` href

This is a blocking contract, not a nice-to-have.  
这不是“最好这样”，而是阻塞级合约。

If you touched routing, link generation, wiki rendering, or showcase sync, treat this section as mandatory.  
如果你改动了 routing、链接生成、wiki 渲染或 showcase sync，把这一节视为强制项。

## Repeated-Use Stability Loop / 重复使用稳定性循环

Do not stop at one happy-path click.  
不要只点通一次就结束。

On the verified path, repeat these scenarios in both English and Chinese UI modes:  
在已验证路径上，请在英文和中文 UI 下都重复这些场景：

1. open `/dashboard`, wait, then click into `/topics`
2. open `/topics`, enter `/topics/openclaw`, go back, enter again, then enter a third time
3. open `/questions?topic=openclaw`, click into `/sessions?topic=openclaw`, go back, click again
4. open `/sessions?topic=openclaw`, wait, then click into `/syntheses?topic=openclaw`
5. open `/examples/openclaw`, wait, open an article, reload, and verify the article route still renders
6. open `/settings`, switch language, reload, then return to `/dashboard` and `/topics`
7. navigate away and back through shell links: `/topics -> /settings -> /topics`
8. simulate re-entry by opening a fresh tab or window after locale persistence, then reopen `/dashboard` and `/topics/openclaw`

   具体是：
   1. 打开 `/dashboard`，等待后再点进 `/topics`
   2. 打开 `/topics`，进入 `/topics/openclaw`，返回，再进一次，再进第三次
   3. 打开 `/questions?topic=openclaw`，点进 `/sessions?topic=openclaw`，返回，再点一次
   4. 打开 `/sessions?topic=openclaw`，等待后再点进 `/syntheses?topic=openclaw`
   5. 打开 `/examples/openclaw`，等待，进入一篇文章，reload，然后确认文章路由仍能渲染
   6. 打开 `/settings`，切换语言，reload，然后回到 `/dashboard` 和 `/topics`
   7. 通过 shell 链接做 away-and-back：`/topics -> /settings -> /topics`
   8. 在语言持久化后，新开一个标签页或窗口，再次打开 `/dashboard` 和 `/topics/openclaw`

## Showcase Validation / Showcase 验证

Run and confirm:  
运行并确认：

```bash
npm run test:e2e:navigation
npm run example:openclaw:validate
npm run verify:routes
npm run verify:full
```

Expected result:  
预期结果：

- the committed OpenClaw baseline still validates  
  仓库里提交的 OpenClaw baseline 仍然通过验证
- the browser navigation regression test stays green  
  浏览器导航回归测试保持通过
- the rendered workspace can be recreated  
  rendered workspace 可以被重新生成
- the Obsidian vault projection still matches the committed example  
  Obsidian vault projection 与提交进仓库的案例仍然一致
- the production showcase routes do not emit `pagePath` or `.html` hrefs  
  生产形态的 showcase 路由不会产出 `pagePath` 或 `.html` href

For AI maintainers: if this section fails, fix the code or showcase state first, then update docs last.  
给 AI 维护者的规则：如果这一节失败，先修代码或 showcase 状态，最后再改文档。

## Optional Live Smoke / 可选 live 流程验证

1. Copy `.env.example` to `.env.local`.  
   把 `.env.example` 复制成 `.env.local`。
2. Set `OPENAI_API_KEY`.  
   设置 `OPENAI_API_KEY`。
3. Run `npm run example:openclaw:live`.  
   运行 `npm run example:openclaw:live`。
4. Confirm the live workspace is created under `tmp/openclaw-workspace-live`.  
   确认 live workspace 出现在 `tmp/openclaw-workspace-live`。

## If Something Fails / 如果某一步失败

- capture the route  
  记录失败的路由
- capture the visible error  
  记录页面上的报错
- capture the relevant workspace path  
  记录相关 workspace 路径
- rerun `npm run env:check` and `npm run example:openclaw:validate` first  
  优先重跑 `npm run env:check` 和 `npm run example:openclaw:validate`
