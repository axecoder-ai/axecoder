# 选型记录 — settings-rules-tab

## 2a 选型摘要

**需求：** 设置页实现「Rules, Skills, Subagents」中的 **Rules**：列表、All/User/AxeCoder 筛选、`+ New`、说明文案；规则作用于 Agent（至少 alwaysApply）。

**对比表**

| 维度 | 提案 1 `.mdc` 双源 | 提案 2 `rules.json` |
|------|-------------------|---------------------|
| 核心思路 | 项目 `.cursor/rules` + 用户 `~/.axecoder/rules` | 单文件 JSON 存元数据与正文 |
| 改动范围 | rules-store、IPC、Tab、agent-system-prompt | rules-store(JSON)、Tab、注入 |
| 优点 | 与 Cursor 互通、可 Git 管理 | 实现快 |
| 缺点 | 需解析 mdc、路径校验 | 不互通 Cursor |
| 工作量 | 中 | 小 |
| 适合场景 | 长期与 Cursor 规则一致 | 仅 AxeCoder 自用 |

**推荐：** 提案 1 — 与调研及现有 `.mdc` 一致。

## 2b 用户选择

- **选定：** 提案 1 – `.mdc` 双源 + rules-store IPC
- **调整：** V1 完整 Tab 外壳（All/User/AxeCoder 筛选 + 第三方导入开关占位）；Skills/Subagents 仅标题占位
