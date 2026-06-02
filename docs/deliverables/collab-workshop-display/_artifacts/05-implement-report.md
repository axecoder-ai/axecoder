# 实现报告 – collab-workshop-display

## 功能说明

1. **思考在回复下方**：员工消息单条存储 `text`（正文）+ `reasoningContent`（可折叠，UI 在正文气泡之下）；流式 `AgentProgressStream` 嵌在 `WorkshopMessageItem` 内，不再单独占列表一行。
2. **身份不编造**：`WorkshopPane.roleProps` 对员工角色仅用 `users.json` 绑定；未绑定显示「未配置」；编排严格模式跳过未绑定员工并写入 system 提示。
3. **用户消息保留**：`startWorkshopRun` / `answerWorkshopQuestion` 在末条可见 user 文本相同时不重复 push；多轮澄清仍各自落盘。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/workshop/workshop-types.ts` | `reasoningContent` 字段 |
| `electron/main/workshop/workshop-orchestrator.ts` | 复合 push、严格绑定、用户去重 |
| `electron/main/workshop/workshop-store.ts` | `normalizeWorkshopMessages` + 读取迁移 |
| `electron/main/workshop/workshop-user-bind.ts` | 主进程角色绑定 |
| `src/components/workbench/WorkshopMessageItem.vue` | 正文→思考→进度 |
| `src/components/workbench/WorkshopPane.vue` | 流式内嵌、身份收紧 |
| `src/types/axecoder.d.ts` | 类型同步 |
| `tests/unittest/UT-collab-workshop/*` | 种子 users、新用例 |

## 注意事项

- 配置目录为 `~/.aex-coder/users.json`（兼容 `.axecoder` 迁移）。
- 仅配置经理时，后端/前端/测试将被跳过直至在设置中补全用户。
