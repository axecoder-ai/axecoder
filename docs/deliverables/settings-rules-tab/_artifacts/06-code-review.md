# 代码审查 — settings-rules-tab

## 结论

**通过** — 无阻塞项。

## 功能

- 与已确认方案一致：双源 `.mdc`、设置 CRUD、alwaysApply 注入。
- UI 含筛选、第三方开关占位、Rules 列表与折叠；Skills/Subagents 占位合理。

## 质量

- 路径校验（`safeFileName`、`assertInsideDir`）防止目录穿越。
- `loadAlwaysApplyRulesPrompt` 对无效项目路径容错，不阻断 system prompt 组装。
- 单测覆盖解析与存储主路径。

## 非阻塞待办

- globs 按文件路径应用规则
- Skills / Subagents 管理与第三方配置真实导入
- 设置页打开时若项目切换，可监听 `project:open` 自动 `reloadRules`
