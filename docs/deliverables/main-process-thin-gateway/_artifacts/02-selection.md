# 方案选型记录

## 一句话需求回顾

在 Agent Worker、Extension Host LSP 已落地基础上，将主进程收敛为「窗口 / 菜单 / 磁盘 / 子进程桥接」薄网关；Workshop、CodeGraph、MCP、AI 等重业务迁出主进程事件循环。

## 方案对比表

| 维度 | 提案 1 – 分层多 Worker | 提案 2 – 单 IDE Sidecar | 提案 3 – 网关整理 |
|------|------------------------|-------------------------|-------------------|
| 核心思路 | Agent + Workshop + Indexer 各独立 Worker | 一个 Sidecar 承载重业务 | 仅默认开 Agent Worker + 目录重组 |
| 主要改动范围 | 2 个新 worker + bridge | 1 个 sidecar + bridge | config + index 注册表 |
| 优点 | 隔离最好，复用既有 bridge | 进程数少 | 工作量小 |
| 缺点 / 风险 | 进程多、分阶段 | Sidecar 仍厚 | 不解决阻塞 |
| 工作量 | 大 | 中–大 | 小 |
| 适合场景 | 长期对齐 VS Code | 快速变薄 | 过渡 |

## 关键差异说明

- 选 **提案 1**：Workshop 与 CodeGraph 独立隔离，与 Agent/Extension Host 模式一致。
- 选 **提案 2**：单辅助进程，崩溃影响面大。
- 选 **提案 3**：不新增子进程，达不到薄网关目标。

## 推荐方案

**推荐：提案 1 – 分层多 Worker**

## 用户最终选择

- **选定提案：** 提案 1 – 分层多 Worker（Workshop Worker + Indexer Worker + 默认启用 Agent Worker）
- **调整说明：** 无额外调整，按方案原文落地
