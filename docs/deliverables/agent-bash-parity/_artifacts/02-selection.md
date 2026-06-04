# 选型记录（agent-bash-parity）

## 2a 选型摘要

### 一句话需求回顾

将 Claude Code 的 `Bash` 工具能力对齐到 AxeCoder。本轮边界：不引入 CC 级 sandbox/bash classifier；Windows 持久 shell 后续再做。

### 方案对比表

| 维度 | 提案 1 – CC Bash 运行时全量对齐 | 提案 2 – 契约对齐 + 轻量后台 |
|------|--------------------------------|------------------------------|
| 核心思路 | 持久 bash 会话 + 15s 自动后台 + 流式 progress | 保持单次 spawn，补齐 schema 与后台任务 |
| 主要改动范围 | agent-bash-session、bash-tasks、loop、UI 大改 | agent-bash、bash-tasks、tool-executor、prompt |
| 优点 | 真 1:1，长命令体验接近 CC | 改动小、风险低、可快速交付 |
| 缺点 / 风险 | 进程管理复杂、工期长 | 非完整 1:1（无持久 cwd、无自动后台） |
| 工作量（粗估） | 大 | 中 |
| 适合场景 | 必须行为级 1:1 | 先满足模型契约与后台命令 |

### 关键差异说明

- 选提案 1：多次 Bash 共享 cwd；`npm run dev` 可 `run_in_background` 且 15s 后自动转后台。
- 选提案 2：每次独立 shell；仅显式 `run_in_background` 走后台任务表。
- 两方案均可扩展 `TaskOutput` 读后台输出；提案 1 还需会话进程生命周期管理。
- 沙箱/classifier 两方案均建议二期。
- 用户调整「Windows 持久 shell 后续」与提案 2 一致（首版不做了持久会话）。

### 推荐方案

**推荐：提案 1 – CC Bash 运行时全量对齐**

**推荐理由：** 需求表述为 1:1；持久会话与自动后台是 CC 文档中与「单次 exec」差异最大的行为。若工期紧，提案 2 可作为阶段性交付，但需在交付说明中标注缺口。

### 选型提示

下一步通过选择题确认；完整草案见 `docs/proposals/proposal-agent-bash-parity.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 2 – 契约对齐 + 轻量后台
- **调整说明：** 首版仅保证 macOS/Linux；Windows 持久 shell 后续再做（与提案 2 范围一致）

## 2c 落盘

本文档即选型记录。
