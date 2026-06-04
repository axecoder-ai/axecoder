# 选型记录

## 2a 摘要

**需求：** Workshop 集成到聊天；输入区 Multi-Agent 即 Workshop；侧栏入口收敛；对外统一称 **Multi-Agent**（不把下拉改名为 Workshop）。

**推荐：** 提案 1。

## 用户选择

- **选定：** 提案 1 – 模式开关映射
- **调整：** Workshop 对外名称改为 **Multi-Agent**（保留 `chatModeId: multi-agent`）

## 2a 对比（节选）

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心思路 | 选 Multi-Agent 切 workshop 标签 | 单 composer 路由 |
| 改动面 | 小 | 大 |
| 符合附图 | 是（模式即入口） | 更强 |
