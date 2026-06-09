# 选型记录 — agent-progress-detail

## 2a 选型摘要

**需求：** 进度流不再只显示 Thinking/Bash/turn N，需展示 Model Call 返回与 Tool Result 正文。

| 维度 | 提案 1 扩展 detail | 提案 2 结构化 StepCard |
|------|-------------------|----------------------|
| 核心思路 | done 事件带 detail，前端 pre 展示 | 新事件类型 + 独立卡片组件 |
| 改动范围 | agent-loop、agent-progress、AgentProgressStream | 同上 + 新组件 + 更多样式 |
| 优点 | 最小改动、复用现有 SSE | 体验更好、可高亮 |
| 缺点 | 长文本需截断 | 工作量大 |
| 工作量 | 小 | 中 |
| 适合场景 | 快速满足开发者调试 | 长期产品化 |

**推荐：提案 1** — 与 thinking-live-progress 一脉相承，满足「看 Model/Tool 返回」核心诉求。

## 2b 用户选择

- **选定：** 提案 1 – 扩展 progress payload 附带 detail 字段
- **调整：** 无
