# 方案选型记录

## 2a 选型摘要（归档）

**需求回顾：** Collab Workshop 各角色需能 Read/Write/Grep 读改仓库（如 `zhongzhi`），而非仅 LLM 空谈澄清。

| 维度 | 提案 1 Mini Agent Loop | 提案 2 复用 runSubAgentTask |
|------|------------------------|------------------------------|
| 核心思路 | 每角色独立 workshop agent 循环 + pending 确认 | 每角色调用已有子代理 |
| 改动范围 | workshop-role-agent、runtime、confirm IPC | workshop-subagent-speaker、ipc 切换 |
| 优点 | 与 Chat diff 确认一致 | 落地快、工具已齐 |
| 缺点/风险 | 工程量大 | 写盘自动 apply；无 AskUser |
| 工作量 | 大 | 中 |
| 适合场景 | 要强安全与 UI 一致 | 尽快能读仓库 |

**推荐：** 提案 1（体验与 Chat 对齐）。

**关键差异：** 提案 2 子代理自动 apply 写盘；提案 1 可挂 Workshop pending。

## 2b 用户最终选择

- **选定：** 提案 2 – 复用 `runSubAgentTask`
- **调整说明：** 无额外调整
