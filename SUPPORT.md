# Support / Verification Matrix / 支持与验证矩阵

This file states what is actually verified, what is only partially verified, and what is not yet fully certified.  
这份文件只说明三件事：哪些已经真实验证、哪些只是部分验证、哪些还没有完整认证。

Prefer this matrix over broad confidence language.  
比起模糊的“应该都行”，请优先相信这份矩阵。

Machine-readable mirror: [verified-path.json](./verified-path.json).  
机器可读镜像： [verified-path.json](./verified-path.json)。

## Official Verified Path / 官方已验证路径

The current verified path is:  
当前真正验证过的路径是：

- machine / OS: macOS 15.5 on Apple Silicon (`arm64`)  
  机器 / 系统：Apple Silicon (`arm64`) 上的 macOS 15.5
- Node.js: verified on Node.js `25.6.1`; repository minimum remains Node.js `20+`  
  Node.js：已在 `25.6.1` 上验证；仓库最低要求仍然是 Node.js `20+`
- package manager: `npm`  
  包管理器：`npm`
- browser automation: Playwright Chromium  
  浏览器自动化：Playwright Chromium
- manual browser pass: repeated-use desktop browser pass on the same machine  
  手动浏览器验证：同一台机器上的桌面浏览器 repeated-use 实测
- language modes: English and Chinese UI  
  语言模式：英文与中文 UI
- product mode: local reference mode with committed demo/showcase data  
  产品模式：基于已提交 demo/showcase 数据的本地 reference mode

Verified routes on that path:  
这条路径上已验证的路由：

- `/dashboard`
- `/topics`
- `/topics/openclaw`
- `/topics/local-first-software`
- `/questions?topic=openclaw`
- `/sessions?topic=openclaw`
- `/syntheses?topic=openclaw`
- `/examples/openclaw`
- `/settings`

Verified commands on that path:  
这条路径上已验证的命令：

```bash
npm install
npm run env:check
npm run demo:reset
npm run showcase:openclaw
npm run verify:fast
npm run verify:local
npm run verify:full
npm run test:e2e:navigation
npm run verify:routes
```

## Partially Verified / 部分验证

These paths are expected to work, but are not yet certified to the same depth as the official verified path.  
这些路径“应该可用”，但还没有达到官方已验证路径那样的认证深度。

- other desktop UNIX-like environments where Node.js 20+, Next.js, and Playwright Chromium all run cleanly  
  其他能正常运行 Node.js 20+、Next.js 和 Playwright Chromium 的类 UNIX 桌面环境
- other Chromium-based browsers used manually  
  手动使用的其他 Chromium 系浏览器
- local runs on machines where you override the default verification ports  
  通过端口覆盖变量运行验证链路的机器
- live provider-backed runs with `OPENAI_API_KEY` configured  
  配置了 `OPENAI_API_KEY` 的 live provider 路径

Treat these as best-effort until they are separately validated.  
在单独验证之前，请把这些路径视为 best-effort。

## Not Yet Fully Certified / 尚未完整认证

Do not overclaim these surfaces.  
不要对这些表面做过度承诺。

- Windows
- Linux
- Safari
- Firefox
- mobile browsers
- CI matrices across multiple operating systems
- byte-for-byte stable output for live provider-backed runs

These may work, but this repository does not currently certify them.  
它们也许能工作，但这个仓库目前并没有正式认证它们。

## Official Supported Path Vs Best-Effort Path / 官方支持路径与 Best-Effort 路径

### Official supported path / 官方支持路径

- run the committed reference data locally  
  在本地运行已提交的 reference 数据
- verify with `npm run verify:local` or `npm run verify:full`  
  用 `npm run verify:local` 或 `npm run verify:full` 验证
- use Playwright Chromium for formal browser regression checks  
  用 Playwright Chromium 跑正式浏览器回归
- use OpenClaw as the official showcase  
  用 OpenClaw 作为官方 showcase

### Best-effort path / Best-effort 路径

- live provider-backed runs
- browsers outside Chromium
- operating systems outside the verified macOS path

  这些都属于 best-effort：live provider 路径、Chromium 之外的浏览器，以及当前已验证 macOS 路径之外的操作系统。

## What Each Verification Command Proves / 每条验证命令分别证明什么

- `npm run env:check`
  Confirms Node.js requirement, the compact verified-path contract, committed demo/showcase files, Playwright Chromium, and writable runtime folders.
  确认 Node.js 版本要求、紧凑的 verified-path 合约、已提交的 demo/showcase 文件、Playwright Chromium，以及运行目录可写。
- `npm run verify:fast`
  Confirms environment sanity, lint, and unit/integration tests.
  确认环境健康、lint 与单元/集成测试。
- `npm run test:e2e:navigation`
  Confirms real-browser route stability, delayed-click safety, reload safety, locale persistence, and repeated-use browser flows.
  确认真实浏览器下的路由稳定、延迟点击安全、reload 安全、语言持久化，以及 repeated-use 浏览器流程。
- `npm run verify:routes`
  Confirms production-style showcase routing stays app-native and does not regress into `pagePath`, `.html`, or download-like behavior.
  确认生产形态的 showcase 路由仍保持 app-native，不会回归出 `pagePath`、`.html` 或下载式行为。
- `npm run verify:local`
  Confirms the official local maintenance path: env, lint, tests, build, showcase validation, route verification, and browser regression.
  确认官方本地维护路径：环境、lint、测试、build、showcase 验证、路由验证、浏览器回归。
- `npm run verify:full`
  Confirms a release-style repeated-run path: reset demo state, rebuild the official showcase, then rerun the full local verification chain.
  确认接近发布前的 repeated-run 路径：重置 demo、重建官方 showcase，然后重跑完整本地验证链。

## Port Override Contract / 端口覆盖约定

If the default verification ports are busy, use explicit overrides instead of patching scripts.  
如果默认验证端口被占用，请使用显式环境变量覆盖，而不是去改脚本。

- Playwright E2E:
  `PLAYWRIGHT_PORT=3401 npm run test:e2e:navigation`
- Reuse an already running browser-test server:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3401 npm run test:e2e:navigation`
- Showcase route verification:
  `VERIFY_ROUTES_PORT=3226 npm run verify:routes`
- Reuse an already running production server:
  `VERIFY_ROUTES_BASE_URL=http://127.0.0.1:3226 npm run verify:routes`

## Official Showcase Boundary / 官方 Showcase 边界

OpenClaw is the official showcase.  
OpenClaw 是官方 showcase。

What another user or AI can rely on:  
另一个用户或 AI 可以可靠依赖的内容：

- the official route path under `/topics/openclaw` through `/examples/openclaw`
- the committed reference showcase under `examples/openclaw-wiki/`
- the reference rebuild and validation commands
- English and Chinese UI over that reference path

  可依赖的包括：`/topics/openclaw` 到 `/examples/openclaw` 的官方路由路径、`examples/openclaw-wiki/` 下的已提交 reference showcase、对应的重建与验证命令，以及这条 reference 路径上的中英文 UI。

What remains best-effort:  
仍然属于 best-effort 的内容：

- live-mode provider output
- behavior on non-verified operating systems and browsers
- any machine-specific workflow outside the documented verification commands

## Maintainer Contact / 维护支持

Current maintainer contact for non-security questions: [maxwelldhx@gmail.com](mailto:maxwelldhx@gmail.com).  
非安全问题的当前维护联系人： [maxwelldhx@gmail.com](mailto:maxwelldhx@gmail.com)。

Security-sensitive issues should follow [SECURITY.md](SECURITY.md).  
涉及安全的问题请遵循 [SECURITY.md](SECURITY.md)。
