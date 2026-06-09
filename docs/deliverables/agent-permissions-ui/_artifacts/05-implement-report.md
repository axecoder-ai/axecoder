# 功能实现报告

## 已实现

| 能力 | 说明 |
|------|------|
| 规则引擎 | `agent-permission-rules.ts`：deny > ask > allow > 只读 allow > mode；支持 `Tool(glob)`、`Tool=literal` |
| 双层配置 | 全局 `~/.axecoder/config.json`（`agentPermission*`）；项目 `.axecoder/permissions.json` |
| Agent 运行时 | `agent-loop.ts` 合并策略并按 Bash command 等 subject 匹配 |
| Settings UI | `PermissionsTab.vue`：全局/项目切换、模式、三列表规则、JSON 编辑 |
| 斜杠命令 | `/permissions` 打开 Permissions 设置页 |
| 兼容 | 继续读取 `agentAllowedTools` / `agentDisallowedTools` |

## 主要文件

- `electron/main/agent/agent-permission-rules.ts`（新）
- `electron/main/project-permissions-store.ts`（新）
- `electron/main/permissions-ipc.ts`（新）
- `electron/main/agent/agent-permissions.ts`、`agent-loop.ts`
- `src/components/workbench/PermissionsTab.vue`、`SettingsPanel.vue`
- `src/slash-commands/builtin.ts`、`App.vue`
- `shared/i18n/locales/{en,zh-CN}.ts`

## 注意事项

- 全局模式使用 `agentPermissionMode`（default/acceptEdits/bypassPermissions）；项目模式使用 ask/allow/deny。
- 空项目 permissions 文件不参与合并。
- `agentAutoApplyWrites` 仍保留于 General 页，与 `acceptEdits` 语义重叠，后续可统一。
