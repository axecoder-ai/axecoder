# 方案选型记录

## 2a 选型摘要

**需求回顾：** 建立 AI Provider 抽象层，聊天/Agent/流式经统一接口分发，四 Provider 为具体实现；消除门面与 UI 分散分支。

### 方案对比表

| 维度 | 提案 1 – Registry + Adapter 分阶段落地 | 提案 2 – 轻量能力 Registry |
|------|----------------------------------------|---------------------------|
| 核心思路 | `AiProviderAdapter` + Registry，门面调 adapter | 仅能力 map，保留 if-else |
| 主要改动范围 | provider-types/registry/adapters + 重构门面与 UI | provider-capabilities + models-types + IPC/UI |
| 优点 | 新 Provider 只加 adapter；tools 下沉 | 改动小、上线快 |
| 缺点 / 风险 | Phase 2 Agent 回归风险；工作量大 | 无法实现抽象调用；门面仍要改 |
| 工作量（粗估） | 大（可分阶段） | 小（1–2 人日） |
| 适合场景 | 长期维护、多 Provider | 工期极紧、只修能力漏改 |

### 关键差异

- 提案 1 实现「聊天走抽象、实现可插拔」；提案 2 只统一能力标志。
- 提案 1 分阶段可降低风险；提案 2 后续做 Adapter 需二次重构。
- Codex 可包装进 adapter，无需重写 wire。

### 推荐方案

**推荐：提案 1 – Registry + Adapter 分阶段落地**

理由：与可行性报告一致；满足用户核心诉求；Codex 实证证明仅能力 map 不够。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – Registry + Adapter 分阶段落地
- **调整说明：** **一次性全量**（plain chat + tools + UI/IPC capabilities），不分阶段迭代

---

## 2c 落盘时间

2025-06-10
