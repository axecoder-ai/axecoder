# 选型记录

## 2a 选型摘要

### 一句话需求回顾

为 AxeCoder Agent Bash 接入 OS 级沙箱：macOS Seatbelt + execpolicy 策略引擎；本期聚焦 macOS。

### 方案对比表

| 维度 | 提案 1 TypeScript 移植 | 提案 2 Rust CLI 桥接 |
|------|------------------------|----------------------|
| 核心思路 | TS 移植 SBPL + execpolicy，挂入 runAgentBash | Rust CLI 子进程桥接 |
| 主要改动范围 | agent-bash 链路 + 2 新模块 | CLI + 构建链 + bridge |
| 优点 | 无 Rust、打包简单 | 上游 1:1 |
| 缺点 / 风险 | 移植细节 | 构建/体积/调试 |
| 工作量 | 中 | 大 |
| 适合场景 | Electron 快速落地 | 深度绑定 DeepSeek-TUI |

### 关键差异

- 提案 1 在 Node 内 sandbox-exec 包装；提案 2 跨进程 Rust。
- 两方案 execpolicy 均可用 `~/.axecoder/execpolicy.toml`。
- 非 macOS 本期不强制 OS 沙箱。

### 推荐

**推荐：提案 1 – TypeScript 移植 Seatbelt + execpolicy**

### 2b 用户最终选择

- **选定提案：** 提案 1 – TypeScript 移植 Seatbelt + execpolicy（最小 Electron 集成）
- **调整说明：** 尽量完整移植 arity-aware 前缀匹配与 cargo/npm cache SBPL 例外（full_parity）
