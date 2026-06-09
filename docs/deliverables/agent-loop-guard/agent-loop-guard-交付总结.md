# Agent Loop Guard 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-loop-guard |
| 完成日期 | 2026-06-07 |
| 选定方案 | 提案 2 — 可配置 guard + 进度通知 + 步数上限 |
| 审查结论 | 通过 |
| 单测 | 本功能 5/5 绿；全量 1 项既有失败（bash-integration） |

---

## 1. 概述

为 AxeCoder Agent 增加运行时**防呆**（loop guard）：当模型反复同一错误失败或重复执行相同写操作时，自动拦截并引导换策略。用户选定提案 2，包含可配置阈值、聊天 UI 警告条、每消息工具轮上限。

交付目录：`docs/deliverables/agent-loop-guard/`，过程稿在 `_artifacts/`。

---

## 2. 方案

- **Storm breaker**：同错连续失败 ≥ 阈值 → tool result 追加 `[loop guard]`。
- **Repeat guard**：写操作同参成功 ≥ 阈值 → 下一次 block。
- **配置**：`agentLoopGuardEnabled`、storm/repeat 阈值、`agentMaxToolRounds`。
- **范围**：`agent-loop.ts`、`agent-subagent.ts`、设置页、进度 UI。

详见 `_artifacts/proposal-agent-loop-guard.md`。

---

## 3. 方案选型过程

推荐提案 1（最小闭环）；用户选定**提案 2**（可配置 + UI + max rounds），无额外调整。见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

见 `_artifacts/plan-agent-loop-guard.md`：新建 `agent-loop-guard.ts` → 挂钩主循环/子代理 → 配置与 UI → 单测。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。核心新文件：`electron/main/agent/agent-loop-guard.ts`。

---

## 6. 单元测试

- 命令：`npm test`
- 本功能：`npx vitest run tests/unittest/UT-agent-loop-guard` → **5/5 通过**
- 全量：512 通过，1 失败（`bash-integration`，非本次引入）

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| 重复写 bash 第 3 次 block | 单测覆盖 |
| 同错 ×3 storm 文案 | 单测覆盖 |
| 关闭 guard | 单测覆盖 |
| 手工长会话死循环 | 待用户验证 |

---

## 8. 代码审查

结论：**通过**。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-loop-guard.ts` | 新增 | 防呆核心 |
| `electron/main/agent/agent-loop.ts` | 修改 | 主循环挂钩 |
| `electron/main/agent/agent-subagent.ts` | 修改 | 子代理挂钩 |
| `electron/main/agent/agent-session-store.ts` | 修改 | 状态字段 |
| `electron/main/config-store.ts` | 修改 | 默认配置 |
| `electron/main/models-types.ts` | 修改 | 类型 |
| `src/utils/agent-progress.ts` | 修改 | 事件类型 |
| `src/components/workbench/ChatPane.vue` | 修改 | notice |
| `src/components/workbench/AgentProgressStream.vue` | 修改 | warn UI |
| `src/components/workbench/GeneralTab.vue` | 修改 | 设置 |
| `shared/i18n/locales/*.ts` | 修改 | 文案 |
| `tests/unittest/UT-agent-loop-guard/` | 新增 | 单测 |

---

## 10. 遗留项

- 修复 `bash-integration` 动态 mock 单测。
- 可选：Workshop 进度条同样展示 `loop_guard`（当前仅 Chat Agent 主面板）。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 方案 | `_artifacts/proposal-agent-loop-guard.md` |
| 计划 | `_artifacts/plan-agent-loop-guard.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
