# Routing Regression Guard / 路由回归守卫

Read this before touching routing, link generation, wiki rendering, showcase routing, or workspace sync.  
如果你要改 routing、链接生成、wiki 渲染、showcase 路由或 workspace sync，先读这份文件。

## Why This Exists / 为什么有这份文件

This repo had a real routing bug where app clicks could degrade into HTML download or file-like navigation.  
这个仓库曾经出现过真实路由 bug：app 内点击会退化成 HTML 下载或文件式跳转。

It was not just a bad first-render href. The regression could appear later after hydration, route transitions, or client-side updates.  
这不只是首屏 href 写错的问题。回归可能在 hydration、路由切换或客户端更新之后才出现。

Treat any return of this bug as blocking.  
任何这种 bug 的回归都应视为阻塞级问题。

## Dangerous Failure Mode / 危险故障模式

Unsafe behavior includes:  
不安全行为包括：

- a main-path click downloads HTML  
  主路径点击触发 HTML 下载
- an app route behaves like raw file navigation  
  app 路由表现得像原始文件跳转
- main-path hrefs emit `pagePath`  
  主路径 href 出现 `pagePath`
- main-path hrefs emit `.html`  
  主路径 href 出现 `.html`
- workspace-root or raw markdown-path semantics leak into normal product routes  
  workspace-root 或原始 markdown 路径语义泄露进正常产品路由

## Where The Risk Lives / 风险点在哪里

- `src/server/lib/page-route-hrefs.ts`
  canonical app href builders  
  canonical app href 构建器
- `src/features/wiki/components/wiki-browser.tsx`
  rendered internal-link normalization  
  渲染后内部链接的归一化
- `src/server/services/openclaw-example-service.ts`
  showcase rendered-workspace sync  
  showcase 渲染 workspace 的同步
- `scripts/check-showcase-routes.mjs`
  automated route/download guard  
  自动化 route/download 守卫

## What Must Not Reappear / 什么绝不能重新出现

- raw `pagePath` params in main-path navigation
- raw `.html` links as app-entry routes
- plain file-path navigation for wiki/article links inside the app
- stale href mutation after hydration or rerender
- accidental workspaceRoot leakage on showcase/topic main-path URLs

  这些都不应重新出现：主路径里的原始 `pagePath`、原始 `.html` 链接、app 内部 wiki/article 的文件路径跳转、hydration 或 rerender 后的坏 href 变异，以及 showcase/topic 主路径上的 workspaceRoot 泄露。

## Safe Route Behavior In This Repo / 这个仓库里的安全路由行为

Safe route behavior means:  
这个仓库里的安全路由行为，指的是：

- main-path routes stay app-native
- internal wiki/article links are normalized into app routes
- no click downloads HTML
- no click behaves like opening a raw generated file
- route behavior remains safe immediately, after waiting, and after rerender or navigation

  也就是说：主路径必须保持 app-native，内部 wiki/article 链接必须被归一化，没有任何点击会下载 HTML，也没有任何点击会像打开原始生成文件一样工作，并且这些性质在等待、rerender、路由切换之后依然成立。

## Stable Routes / 必须稳定的路由

- `/dashboard`
- `/topics`
- `/topics/openclaw`
- `/questions?topic=openclaw`
- `/sessions?topic=openclaw`
- `/syntheses?topic=openclaw`
- `/examples/openclaw`
- `/settings`

## Required Checks After Routing-Sensitive Changes / 路由敏感改动后的必跑检查

Run:  
运行：

```bash
npm run test:e2e:navigation
npm run verify:routes
```

Then manually verify:  
然后手动验证：

- immediate click after page load  
  页面刚加载后立即点击
- delayed click after waiting on the page  
  页面停留一段时间后点击
- second click on the same route family  
  同一条路线族上的第二次点击
- click after navigating away and back  
  跳走再回来后点击
- click after client rerender or route transition  
  客户端 rerender 或路由切换后的点击
- click through `/settings` and switch language once  
  打开 `/settings` 并切换一次语言

## Manual Click Modes / 手动点击模式

Use this sequence on the main path:  
在主路径上用这个顺序：

1. open the page
2. click immediately
3. reopen the page
4. wait
5. click again
6. navigate elsewhere and back
7. click again
8. open `/settings`, switch language, reload, and click again

`npm run test:e2e:navigation` is the formal browser regression guard for this sequence.  
`npm run test:e2e:navigation` 是这套序列的正式浏览器回归守卫。

If any click downloads HTML or behaves like a file open, stop and fix it before doing anything else.  
如果任何一次点击触发 HTML 下载或表现得像打开文件，立刻停下并先修复它。

## Short Rule / 最短规则

Main-path links must stay route-native and page-id based, never file-path based.  
主路径链接必须保持 route-native 且基于 pageId，绝不能基于文件路径。
