# agent-os-sandbox 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-os-sandbox |
| 完成日期 | 2026-06-05 |
| 选定方案 | 提案 1 – TypeScript 移植 Seatbelt + execpolicy |
| 审查结论 | 通过 |
| 单测 | 393/393 全绿 |

---

## 1. 概述

为 AxeCoder Agent Bash 接入 DeepSeek-TUI 风格的 **OS 级沙箱**（macOS Seatbelt）与 **execpolicy 策略引擎**。用户选定提案 1 并要求 full_parity（完整 arity 匹配 + cargo/npm SBPL 例外）。

交付物目录：`docs/deliverables/agent-os-sandbox/_artifacts/`

---

## 2. 方案

- macOS：`sandbox-exec` 包装 shell，默认 workspace-write、禁止网络
- execpolicy：`~/.axecoder/execpolicy.toml`，allow/deny/ask
- 非 macOS：仅 execpolicy + 既有 git 拦截

---

## 3. 方案选型过程

推荐提案 1（TypeScript 移植）。用户确认提案 1 + full_parity 调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

三阶段：策略引擎 → Seatbelt → 集成。详见 `_artifacts/plan-agent-os-sandbox.md`。

---

## 5. 实现说明

新增 5 个 agent 模块，修改 `agent-bash.ts`、`agent-bash-tasks.ts`、`tool-executor.ts`。详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

`npm test`：90 文件、393 用例全绿。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动：execpolicy 9 + seatbelt 4 + integration 1
- 手工：macOS 上建议验证写项目外路径、curl 被 Seatbelt 拒绝（待用户实机）

---

## 8. 代码审查

结论：**通过**。非阻塞：hooks 未加沙箱、设置页未暴露 sandbox_mode。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-bash-arity-table.ts` | 新增 | 218 条 arity 表 |
| `electron/main/agent/agent-command-arity.ts` | 新增 | classify + prefix 匹配 |
| `electron/main/agent/agent-execpolicy-matcher.ts` | 新增 | heredoc + wildcard |
| `electron/main/agent/agent-execpolicy.ts` | 新增 | TOML 评估 |
| `electron/main/agent/agent-sandbox-seatbelt.ts` | 新增 | SBPL + sandbox-exec |
| `electron/main/agent/agent-bash.ts` | 修改 | 集成策略与沙箱 |
| `electron/main/agent/agent-bash-tasks.ts` | 修改 | 后台 Bash 沙箱 |
| `electron/main/agent/tool-executor.ts` | 修改 | execpolicy deny |
| `tests/unittest/UT-agent-os-sandbox/` | 新增 | 14 用例 |

---

## 10. 遗留项与后续建议

1. 设置页 `sandbox_mode` / 网络开关
2. `agent-hooks.ts` 同步 Seatbelt
3. Linux Landlock 移植

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-agent-os-sandbox.md` |
| 计划 | `_artifacts/plan-agent-os-sandbox.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
