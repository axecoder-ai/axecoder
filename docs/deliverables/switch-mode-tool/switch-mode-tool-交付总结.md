# SwitchMode 工具 交付总结

| 字段 | 内容 |
|------|------|
| **任务名** | switch-mode-tool |
| **完成日期** | 2025-06-10 |
| **选定方案** | 提案 2 – SwitchMode 统一会话模式 |
| **审查结论** | 通过 |
| **单测（本轮范围）** | 23/23 全绿 |

---

## 1. 概述

为 AxeCoder Agent 新增 **SwitchMode** 工具，对齐 Cursor playbook，并同步 ChatModeId、planMode、activeTools 与 Renderer UI。

**选型：** 用户选定提案 2（含 ChatMode + UI 同步）。

**交付物目录：** `docs/deliverables/switch-mode-tool/_artifacts/`

---

## 2. 方案

- `SwitchMode({ target_mode_id, explanation? })`
- target：`agent` | `plan` | `planning` | `planning-only` | `auto-plan` | `reflection`
- `agent:progress` `chat_mode` 事件驱动 ChatPane
- 保留 EnterPlanMode / ExitPlanMode

详见 `_artifacts/proposal-switch-mode-tool.md`

---

## 3. 方案选型过程

用户选定提案 2；无额外调整。对比摘要见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

Main 核心 → 工具注册 → Renderer 同步 → 单测。详见 `_artifacts/plan-switch-mode-tool.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

本轮 23/23 全绿；全量 579/581（1 个既有失败）。见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| target 解析 | ✅ |
| planMode / tools 切换 | ✅ |
| executor 集成 | ✅ |
| EnterPlanMode 回归 | ✅ |

---

## 8. 代码审查

**通过。** 见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/chat-mode.ts` | 修改 | applySwitchModeToSession |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | SwitchMode 执行 |
| `electron/main/agent/agent-types.ts` | 修改 | 工具名 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | schema |
| `electron/main/agent/agent-session-store.ts` | 修改 | chatMode |
| `electron/main/agent/agent-loop.ts` | 修改 | 初始化 |
| `src/utils/agent-progress.ts` | 修改 | chat_mode 事件 |
| `src/components/workbench/ChatPane.vue` | 修改 | UI 同步 |
| `tests/unittest/UT-switch-mode-tool/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- SwitchMode 后 system prompt addon 不重写（已知）
- 修复既有 bash-integration 单测

---

## 11. 附录：过程文档索引

- `_artifacts/02-selection.md`
- `_artifacts/proposal-switch-mode-tool.md`
- `_artifacts/plan-switch-mode-tool.md`
- `_artifacts/05-implement-report.md`
- `_artifacts/05-unittest.md`
- `_artifacts/06-code-review.md`
