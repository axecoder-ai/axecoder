# 选型记录

## 需求

Serper 需自备 Key，用户希望像 Cursor 一样免 Key；建议用已有 Playwright 基建做 WebSearch。

## 对比摘要

| 维度 | 提案 1 Playwright 替代 | 提案 2 双路径 |
|------|------------------------|---------------|
| Key | 不需要 | 可选 Serper |
| 复杂度 | 中 | 高 |

**推荐：** 提案 1

## 用户选择

- **选定：** 提案 1 – Playwright 完全替代 Serper（免 Key）
- **调整：** WebSearch 与 WebRun 合并为一个「浏览器能力」开关
