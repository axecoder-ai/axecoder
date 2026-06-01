# 计划：斜杠命令与扩展生态

## 阶段

1. IPC：agent:listMcp、listSkills、loadSkill、listOutputStyles、setOutputStyle、planModeHelp、rewindHelp
2. 内置斜杠：help/clear/new/model/compact/hooks/mcp/plan/skills/rewind/style
3. Skill 动态注册 + ChatPane 打开项目时 refresh
4. 自定义 output-styles 目录 + agent-loop 刷新缓存
5. 单测 + 交付文档

## 验收

- `/help` 列出内置 + 动态 Skill 命令
- `/style` 可切换内置与自定义风格
- `npm test` 全绿
