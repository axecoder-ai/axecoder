# WebSearch Serper 一键启用 — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | websearch-serper-enable |
| 完成日期 | 2026-06-11 |
| 选定方案 | 提案 2 – Settings 一键开 + SERPER_API_KEY |
| 审查结论 | 通过 |
| 单测 | 全绿（642/642） |

---

## 1. 概述

**需求：** Serper WebSearch 已接入但默认关，启用需先开开关再填 Key。目标：Settings 一键开，并支持环境变量 `SERPER_API_KEY`。

**本轮目标：** 降低 Settings 操作步骤；保留显式关闭能力；运行时 Key 多来源解析。

**选型：** 推荐提案 1（Key 自动启用），用户选定提案 2 并增加 env 支持。

**交付物目录：** `docs/deliverables/websearch-serper-enable/_artifacts/`

---

## 2. 方案

- Settings「启用网页搜索」→ 填 Key → 保存即 `agentFeatureWebSearch: true`
- 「关闭」仅关 flag，Key 保留
- `resolveWebSearchApiKey`：Settings Key > `SERPER_API_KEY`
- 开关关时 executor 拒绝 WebSearch

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2（选定） |
|------|--------|----------------|
| 核心 | 有 Key 即用 | 一键开 + 显式关 |
| env | 天然友好 | 用户要求增补 |

**调整：** 同时支持 `SERPER_API_KEY`。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段一 Key 解析 → 阶段二 Settings UX → 阶段三 UT。详见 `_artifacts/plan-websearch-serper-enable.md`。

---

## 5. 实现说明

- `GeneralTab.vue`：按钮式启用/关闭；保存 Key 自动开 flag
- `agent-web.ts`：`resolveWebSearchApiKey`
- `agent-ext-executor.ts`：使用解析 Key
- i18n：`webSearchEnable` / `webSearchDisable` / `webSearchEnvKeyHint`

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：135 文件、642 用例全通过
- 新增：`resolveWebSearchApiKey`、env Key executor 用例

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：UT 全绿
- 手工建议：Settings 点启用 → 填 Serper Key → Agent 调 WebSearch；设 `SERPER_API_KEY` 且开关开 → 无 Settings Key 仍可搜索

---

## 8. 代码审查

结论：**通过**。无阻塞项。P2：env 状态徽章、Serper 测试连接按钮。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-web.ts` | 修改 | Key 解析与错误文案 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | 使用解析 Key |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | 工具描述 |
| `src/components/workbench/GeneralTab.vue` | 修改 | 一键开/关 UX |
| `shared/i18n/locales/en.ts` | 修改 | 文案 |
| `shared/i18n/locales/zh-CN.ts` | 修改 | 文案 |
| `tests/unittest/UT-web-search-webrun/web-search-webrun.test.ts` | 修改 | 新用例 |

---

## 10. 遗留项与后续建议

- 仅 env Key 时 UI 状态提示
- Serper「测试连接」按钮
- 调研矩阵 §18 可将 WebSearch 默认策略再评估

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| `_artifacts/00-research-links.md` | 调研索引 |
| `_artifacts/02-selection.md` | 选型记录 |
| `_artifacts/proposal-websearch-serper-enable.md` | 已确认方案 |
| `_artifacts/plan-websearch-serper-enable.md` | 实施计划 |
| `_artifacts/05-implement-report.md` | 实现报告 |
| `_artifacts/05-unittest.md` | 单测记录 |
| `_artifacts/06-code-review.md` | 代码审查 |
