# WebSearch Playwright — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | websearch-playwright |
| 完成日期 | 2026-06-11 |
| 选定方案 | 提案 1 Playwright 替代 Serper + 合并浏览器开关 |
| 审查 | 通过 |
| 单测 | 全绿 640/640 |

---

## 1. 概述

Serper 需自备 Key；改为 Playwright 无头搜索（DuckDuckGo HTML），与 WebRun 共用一个 Settings 开关，**无需 API Key**。

## 2. 方案

- `search` action → DuckDuckGo HTML 解析结果
- `webSearch()` 调 BrowserBridge
- Settings：「浏览器（WebSearch + WebRun）」单开关
- 旧 `agentFeatureWebSearch` 读取映射到 WebRun

## 3. 选型

用户选定提案 1，调整：合并 WebSearch/WebRun 开关。见 `_artifacts/02-selection.md`。

## 4–8. 实现 / 测试 / 审查

见 `_artifacts/05-implement-report.md`、`_artifacts/05-unittest.md`、`_artifacts/06-code-review.md`。

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `browser-runner.mjs` | 修改 | search action |
| `agent-browser-playwright.ts` | 修改 | runBrowserSearch |
| `agent-web.ts` | 修改 | 去 Serper |
| `agent-ext-executor.ts` | 修改 | 合并门控 |
| `config-store.ts` | 修改 | 兼容映射 |
| `GeneralTab.vue` | 修改 | 单开关 |
| `shared/i18n/locales/*.ts` | 修改 | 文案 |
| `web-search-webrun.test.ts` | 修改 | UT |

## 10. 使用方式

1. `npx playwright install chromium`
2. Settings → General → 打开 **浏览器（WebSearch + WebRun）**
3. Agent 可直接调 WebSearch，无需 Key

## 11. 附录

- `_artifacts/00-research-links.md`
- `_artifacts/02-selection.md`
- `_artifacts/proposal-websearch-playwright.md`
- `_artifacts/plan-websearch-playwright.md`
