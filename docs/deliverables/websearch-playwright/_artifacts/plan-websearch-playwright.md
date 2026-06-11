# WebSearch Playwright 设计文档

**desired_location:** `docs/plans/plan-websearch-playwright.md`

## 需求

- WebSearch 用 Playwright，免 Serper Key
- Settings 仅一个「浏览器自动化」开关（WebSearch + WebRun）
- 旧 `agentFeatureWebSearch` 配置向后兼容

## 实施计划

1. `browser-runner.mjs` — `search` action（DuckDuckGo HTML）
2. `agent-browser-playwright.ts` — `runBrowserSearch`，VALID_ACTIONS 含 search
3. `agent-web.ts` — 删除 Serper，webSearch 调 Playwright
4. `agent-ext-executor.ts` — WebSearch 门控 `agentFeatureWebRun`
5. `config-store.ts` — WebRun 默认读 WebSearch 旧值
6. `GeneralTab.vue` — 去掉 WebSearch 区块，WebRun 文案含 WebSearch
7. i18n + UT

## 测试策略

- Mock spawn search 协议
- 回归 WebRun navigate
