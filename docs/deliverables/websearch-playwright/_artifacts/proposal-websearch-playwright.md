**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** WebSearch 改 Playwright 免 Serper Key；与 WebRun 合并开关。
- **调研来源：** `browser-runner.mjs`、`agent-browser-playwright.ts`、`agent-web.ts`
- **选定基础：** 提案 1
- **用户调整：** WebSearch + WebRun 单一 Settings 开关

### 最终方案 – Playwright WebSearch + 合并浏览器开关

- **概述：** `browser-runner.mjs` 新增 `search`（DuckDuckGo HTML 抓取）；`webSearch()` 走 BrowserBridge；executor 门控统一为 `agentFeatureWebRun`；Settings 移除 Serper Key 与独立 WebSearch 开关；`agentFeatureWebSearch` 读取时兼容映射到 WebRun。
- **关键变更：** `browser-runner.mjs`、`agent-browser-playwright.ts`、`agent-web.ts`、`agent-ext-executor.ts`、`GeneralTab.vue`、i18n、UT
- **权衡：** 免 Key；抓取稳定性低于 Serper API
- **验证：** UT mock search；手工开浏览器开关后 WebSearch 无 Key 可用
