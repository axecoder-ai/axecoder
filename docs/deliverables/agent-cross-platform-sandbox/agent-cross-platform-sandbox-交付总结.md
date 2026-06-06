# agent-cross-platform-sandbox 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-cross-platform-sandbox |
| 完成日期 | 2026-06-06 |
| 选定方案 | 提案 1 – TypeScript 统一 SandboxManager + Linux bwrap |
| 审查结论 | 通过 |
| 单测 | 412/412 全绿 |

---

## 1. 概述

在 `agent-os-sandbox`（macOS Seatbelt + execpolicy）基础上，补齐 **Linux bubblewrap** OS 级文件系统沙箱；Windows 与 DeepSeek-TUI 一致不宣称 FS 沙箱。统一 `buildShellSpawnSpec` 平台分发。

交付物目录：`docs/deliverables/agent-cross-platform-sandbox/_artifacts/`

---

## 2. 方案

- 新增 `agent-sandbox.ts` 统一入口
- macOS → Seatbelt；Linux + bwrap → bubblewrap；Windows → 裸 shell + execpolicy
- `read-only` 模式：bwrap 仅 ro-bind，不写 bind

---

## 3. 方案选型过程

推荐提案 1（纯 TS + bwrap）。用户选定提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

三模块：bwrap → dispatch → bash 集成。详见 `_artifacts/plan-agent-cross-platform-sandbox.md`。

---

## 5. 实现说明

新增 2 个 agent 模块，修改 seatbelt/bash 引用，新增 8 个单测。详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

`npm test`：94 文件、412 用例全绿。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动：bwrap 4 + dispatch 4 + os-sandbox 回归 14
- 手工：Linux 实机建议验证 `apt install bubblewrap` 后写项目外路径失败

---

## 8. 代码审查

结论：**通过**。非阻塞：Plan read-only 映射、设置页、hooks 沙箱。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-sandbox-bwrap.ts` | 新增 | Linux bwrap |
| `electron/main/agent/agent-sandbox.ts` | 新增 | 平台分发 |
| `electron/main/agent/agent-sandbox-seatbelt.ts` | 修改 | 移除 buildShellSpawnSpec |
| `electron/main/agent/agent-bash.ts` | 修改 | import |
| `electron/main/agent/agent-bash-tasks.ts` | 修改 | import |
| `tests/unittest/UT-agent-cross-platform-sandbox/` | 新增 | 8 用例 |

---

## 10. 遗留项与后续建议

1. Plan 模式 → read-only 沙箱
2. 设置页 sandbox_mode / prefer_bwrap
3. hooks 加沙箱
4. Rust Landlock helper（提案 2）若需无 bwrap 环境

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-agent-cross-platform-sandbox.md` |
| 计划 | `_artifacts/plan-agent-cross-platform-sandbox.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
