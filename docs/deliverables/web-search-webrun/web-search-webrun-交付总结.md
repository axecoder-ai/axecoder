# WebSearch / WebRun — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | web-search-webrun |
| 完成日期 | 2026-06-10 |
| 选定方案 | 提案 2 — Serper WebSearch + Playwright WebRun + Settings UI |
| 审查结论 | 通过（非阻塞） |
| 单测 | 596/597 通过；本轮 UT 9/9；1 既有失败见下文 |

---

## 1. 概述

**需求：** 在本系统实现 WebSearch（结束 stub）与 WebRun 浏览器自动化，并暴露 Settings 配置。

**目标：** 对齐 `research-agent-tools-matrix.md` §7 联网缺口；用户可在 Settings 配置 Serper Key 并启用 WebRun。

**选型：** 推荐提案 1（Electron 轻量）；用户选定 **提案 2（Playwright）** + Settings UI。

**交付目录：** `docs/deliverables/web-search-webrun/_artifacts/`

---

## 2. 方案

- **WebSearch：** Serper REST，`agentFeatureWebSearch` + `agentWebSearchApiKey`
- **WebRun：** `browser-runner.mjs` + Playwright 子进程，`agentFeatureWebRun`
- **动作：** navigate / snapshot / click / type / screenshot

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。用户选定提案 2，并要求 Settings WebSearch API Key UI。

---

## 4. 实施计划

见 `_artifacts/plan-web-search-webrun.md`（四阶段：WebSearch → WebRun → Settings → 测试）。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

要点：
- `agent-web.ts` 实装 Serper
- `agent-browser-playwright.ts` + `browser-runner.mjs`
- `GeneralTab.vue` Agent 区新增开关与 Key 输入

---

## 6. 单元测试执行情况

见 `_artifacts/05-unittest.md`。

- 命令：`npm test`
- 本轮新增：`UT-web-search-webrun` **9/9 通过**
- 全量：**596/597**；失败为 `bash-integration.test.ts`（既有，非本轮）

---

## 7. 测试报告

- 自动化：见 §6
- 手工：Settings 填 Serper Key → Agent 调 WebSearch；启用 WebRun 前执行 `npx playwright install chromium` → 调 WebRun navigate/snapshot（待用户环境验证）

---

## 8. 代码审查

见 `_artifacts/06-code-review.md`。**结论：通过。**

待办：打包 Playwright browsers；app 退出时关闭 browser 子进程。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-web.ts` | 修改 | Serper WebSearch |
| `electron/main/agent/agent-browser-playwright.ts` | 新增 | Playwright 桥 |
| `electron/main/agent/browser-runner.mjs` | 新增 | 子进程脚本 |
| `electron/main/agent/agent-types.ts` | 修改 | WebRun 工具名 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | schema |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | 执行器 |
| `electron/main/config-store.ts` | 修改 | agentFeatureWebRun |
| `electron/main/models-types.ts` | 修改 | 类型 |
| `src/types/axecoder.d.ts` | 修改 | AppSettings |
| `src/components/workbench/GeneralTab.vue` | 修改 | Settings UI |
| `shared/i18n/locales/*.ts` | 修改 | 文案 |
| `package.json` | 修改 | playwright |
| `tests/unittest/UT-web-search-webrun/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. `npx playwright install chromium` 写入 README / 首次启用提示
2. electron-builder 打包 browser-runner 与 Chromium
3. 多搜索 provider（Tavily/Bing）扩展
4. 修复 `UT-agent-os-sandbox/bash-integration.test.ts`

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-web-search-webrun.md` |
| `_artifacts/plan-web-search-webrun.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/05-unittest-raw.txt` |
| `_artifacts/06-code-review.md` |
