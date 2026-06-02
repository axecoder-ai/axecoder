# 步骤 2 — 选型记录

## 2a 选型摘要

**需求：** Collab Workshop 会话列表与 Chat Agents 历史合并为同一侧栏；Chat / Workshop 的 session 元数据与 index 统一为单注册表（`kind` 区分），正文仍分文件存储。

| 维度 | 提案 1 统一注册表 | 提案 2 Facade |
|------|-------------------|---------------|
| 核心思路 | 单 `sessions/index.json` + `kind` | 双目录 + 内存合并 |
| 改动范围 | registry + 迁移 + UI | facade + UI |
| 优点 | 单一真相源 | 迁移少 |
| 缺点 | 需迁移 workshops index | 双 index 漂移 |
| 工作量 | 中 | 小 |
| 适合 | 长期统一治理 | 快速拼接 |

**推荐：** 提案 1。

## 2b 用户选择

- **选定：** 提案 1 – 统一 Session 注册表
- **调整说明：** 无额外调整
