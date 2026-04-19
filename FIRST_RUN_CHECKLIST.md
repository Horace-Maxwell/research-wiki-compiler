# First Run Checklist / 首次运行清单

Use this when you just installed the repo and want the shortest successful first impression.  
如果你刚装好仓库，想用最短路径获得一个成功的首印象，就看这份清单。

## 1. Install / 安装

```bash
npm install
npm run env:check
```

## 2. Prepare the demo and showcase / 准备 demo 和 showcase

```bash
npm run demo:reset
npm run showcase:openclaw
```

## 3. Launch the app / 启动应用

```bash
npm run dev
```

## 4. Open these routes in order / 按顺序打开这些路由

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`
6. `/examples/openclaw`
7. `/settings`

## 5. What to click first / 第一轮先点什么

- On `/topics`, open `OpenClaw`.  
  在 `/topics` 上先打开 `OpenClaw`。
- On `/topics/openclaw`, follow the main cards in order: question, session, synthesis.  
  在 `/topics/openclaw` 上，按顺序点主卡片：question、session、synthesis。
- On `/examples/openclaw`, open one featured page from the Start Here column.  
  在 `/examples/openclaw` 上，从 Start Here 一栏里打开任意一篇 featured page。
- On `/settings`, switch the language once and reload to confirm it persists.  
  在 `/settings` 上切换一次语言并刷新，确认设置会保留。

## 6. How to know it is working / 怎么判断它是正常工作的

- routes change in-app instead of downloading HTML  
  路由在 app 内切换，而不是下载 HTML
- OpenClaw pages render with real content  
  OpenClaw 页面能渲染出真实内容
- dashboard and settings load without missing workspace state  
  dashboard 和 settings 不会丢失 workspace 状态
- language switching persists after reload  
  语言切换后刷新依然保持

## 7. What to ignore on the first run / 首次运行先不用管什么

- live provider mode  
  live provider 模式
- support lanes such as gaps, changes, acquisition, and monitoring  
  gaps、changes、acquisition、monitoring 这些 support lanes
- lower-level architecture docs  
  更底层的架构文档

If you want the fixed demo script next, open [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md).  
如果下一步你想看固定演示脚本，打开 [OPENCLAW_WALKTHROUGH.md](./OPENCLAW_WALKTHROUGH.md)。
