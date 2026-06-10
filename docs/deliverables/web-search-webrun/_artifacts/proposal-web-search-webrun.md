**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** 实现 WebSearch 真实 API 与 WebRun 浏览器自动化；Settings 增加 WebSearch 配置 UI。
- **调研来源：** `docs/research/research-agent-tools-matrix.md` §7/§17；`electron/main/agent/agent-web.ts`
- **上游提案：** `docs/proposals/proposal-web-search-webrun.md`（双方案草稿）
- **选定基础：** 提案 2 – Serper WebSearch + Playwright 子进程 WebRun
- **用户调整摘要：** Settings General/Agent 区增加 WebSearch 开关与 API Key 输入。

### 最终方案 – Serper WebSearch + Playwright WebRun

- **概述：** `agent-web.ts` 接入 Serper Google Search API，替换 `webSearchStub`；新增 Playwright 子进程驱动层与 `WebRun` 工具（navigate / snapshot / click / screenshot）；配置项 `agentFeatureWebSearch`、`agentWebSearchApiKey`、`agentFeatureWebRun`；Renderer Settings 可编辑 WebSearch 开关与 Key。
- **相对选定提案的变更：** 增加 Settings UI（GeneralTab Agent 区块）；`AppSettings`/`axecoder.d.ts` 同步 WebSearch 字段。
- **关键变更：**
  - `electron/main/agent/agent-web.ts` — Serper 搜索
  - `electron/main/agent/agent-browser-playwright.ts`（新）— 子进程协议
  - `electron/main/agent/browser-runner.mjs`（新）— Playwright 执行脚本
  - `agent-types.ts`、`agent-tool-prompts-ext.ts`、`agent-ext-executor.ts`、`agent-permissions.ts`
  - `config-store.ts`、`models-types.ts` — `agentFeatureWebRun`
  - `src/types/axecoder.d.ts`、`GeneralTab.vue` — Settings UI
  - `tests/unittest/UT-web-search-webrun/`
- **权衡：** Playwright + Chromium 增大安装/打包体积；单测 mock 子进程，CI 不拉真浏览器。
- **验证：** UT 全绿；手工 Settings 填 Key 后 Agent 调 WebSearch/WebRun。
- **待解决问题：** electron-builder 打包 Playwright browsers（本轮 dev 可用 `npx playwright install chromium`）；多 search provider 后续扩展。

### 未采纳方案说明

- **未选：** 提案 1 – Electron BrowserWindow WebRun
- **原因：** 用户选定 Playwright 以获得更可靠自动化。
