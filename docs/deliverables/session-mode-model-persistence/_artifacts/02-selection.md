# 选型记录

## 2a 选型摘要

**一句话需求回顾：** 每个聊天 session 在发送消息时记住 Mode 与 Model；切回时恢复；旧 session 无记录保持当前 UI；新建用全局默认；嵌入 Workshop 一并恢复状态。

### 方案对比表

| 维度 | 提案 1 就地扩展 Session 字段 | 提案 2 统一 Session 偏好层 |
|------|------------------------------|----------------------------|
| 核心思路 | 在现有 ChatSession 加 modelId，改 ChatPane/Workshop 读写时机 | 新建 useSessionPreferences 统一管理 |
| 主要改动范围 | chat-store、类型、chat-modes、ChatPane、WorkshopChatSection | 同上 + composable |
| 优点 | 改动最小、见效快 | 逻辑集中、易扩展 |
| 缺点 / 风险 | 逻辑分散两处 | 多一层抽象 |
| 工作量 | 小～中 | 中 |
| 适合场景 | 尽快交付 | 后续扩展 per-session 偏好 |

### 关键差异

- 提案 1 直接改组件；提案 2 先抽 composable。
- 磁盘结构两者一致；都需改无字段时保持当前 UI 的解析逻辑。
- 都需避免误写全局 models-store。

**推荐：提案 1 – 就地扩展 Session 字段**

## 2b 用户最终选择

- **选定提案：** 提案 1 – 就地扩展 Session 字段
- **调整说明：** 选提案 1，但将 resolve/stamp 纯函数抽到 utils 便于单测
