# 选型记录

## 2a 选型摘要

**需求：** Agent 工具权限可视化设置 + JSON 配置，参考 同类 Agent。

**推荐：** 提案 1（最小改动，复用现有引擎）

**用户最终选择：** 提案 2 – 项目级 permissions.json + 规则引擎升级（同类 Agent / Reasonix 对齐）

**调整说明：** 用户选择「其他（custom）」— 未在 AskQuestion 中附文字；按提案 2 原文落地，保留全局 `config.json` 与项目 `.axecoder/permissions.json` 双层、UI + JSON 双通道。

## 2b 确认

- 选定提案：提案 2
- 调整：custom（无额外文字，按提案 2 全量范围实施）
