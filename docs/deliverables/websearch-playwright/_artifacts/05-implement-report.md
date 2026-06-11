# 功能实现报告 — WebSearch Playwright

## 功能说明

1. **WebSearch 改 Playwright**：`browser-runner.mjs` 新增 `search`，DuckDuckGo HTML 抓取 title/link/snippet；免 Serper API Key。
2. **合并开关**：Settings 仅保留「浏览器（WebSearch + WebRun）」；WebSearch 门控 `agentFeatureWebRun || agentFeatureWebSearch`（兼容旧配置）。
3. **移除 Serper UI**：GeneralTab 去掉独立 WebSearch 与 Key 输入。

## 修改文件

| 文件 | 说明 |
|------|------|
| `browser-runner.mjs` | search action |
| `agent-browser-playwright.ts` | runBrowserSearch |
| `agent-web.ts` | webSearch → Playwright |
| `agent-ext-executor.ts` | 合并门控 |
| `config-store.ts` | WebRun 回退读 WebSearch |
| `GeneralTab.vue` | 单开关 |
| `shared/i18n/locales/*.ts` | 文案 |
| `tests/.../web-search-webrun.test.ts` | 用例更新 |

## 注意事项

- 首次使用：`npx playwright install chromium`
- 抓取可能受 DuckDuckGo 页面变更或反爬影响
