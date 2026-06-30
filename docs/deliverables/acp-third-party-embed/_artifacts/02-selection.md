# ACP 第三方嵌入 — 选型记录

## 2a 选型摘要

**一句话需求回顾：** 实现 ACP（Agent Client Protocol）第三方嵌入，使 Zed、JetBrains、Neovim 等外部编辑器可通过 stdio JSON-RPC 驱动 AxeCoder Agent，对齐 Cursor `agent acp` 生态位。

| 维度 | 提案 1 独立 ACP stdio 适配器 | 提案 2 Electron 内嵌 + GUI 审批 |
|------|------------------------------|--------------------------------|
| 核心思路 | `axecoder acp` 无头 CLI + `@agentclientprotocol/sdk` | 桌面运行时 ACP Server，审批走现有 UI |
| 主要改动范围 | `electron/main/acp/`、CLI bin、Worker 桥接 | 主进程 + Renderer IPC + Settings |
| 优点 | 符合 ACP 生态；可 CI 单测；改动面小 | AskQuestion/Plan 卡片 UX 完整 |
| 缺点 / 风险 | 阻塞工具 UX 依赖客户端 | 必须开桌面应用；改动面大 |
| 工作量 | 中 | 大 |
| 适合场景 | Zed/JetBrains Registry、headless | 仅桌面内第三方接入 |

**关键差异：**
- 选 1：子进程 stdio，第三方编辑器 spawn `axecoder acp` 即可；权限经 ACP `session/request_permission`。
- 选 2：需 AxeCoder 窗口常驻；审批弹窗与桌面一致。
- 选 1 可独立发布 bin；选 2 与 Electron 生命周期耦合。
- 矩阵目标「ACP 第三方客户端」两方案均可达成；提案 1 与 Cursor/社区惯例一致。

**推荐：提案 1 – 独立 ACP stdio 适配器（`axecoder acp`）**

理由：复用现有 agent-worker ndjson RPC；改动集中；不依赖 GUI；与 Zed/JetBrains ACP Registry 模式一致。提案 2 可作为 V2 GUI 增强。

## 2b 用户最终选择

- **选定提案：** 提案 1 – 独立 ACP stdio 适配器（`axecoder acp`）
- **调整说明：** 无额外调整，按方案原文落地
