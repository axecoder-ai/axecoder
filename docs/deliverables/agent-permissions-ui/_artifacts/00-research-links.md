# 调研链接

- `docs/research/research-参考实现.md` — §5 settings.json `allowedTools`/`disallowedTools`、§4.3 `/permissions` 斜杠命令
- `docs/research/research-axecoder-vs-参考实现.md` — 权限引擎缺口说明
- `electron/main/agent/agent-permissions.ts` — 已有 `resolveToolPermission`、三种 mode
- `electron/main/config-store.ts` — `~/.axecoder/config.json` 持久化 `agentPermissionMode` / `agentAllowedTools` / `agentDisallowedTools`
- `docs/deliverables/agent-runtime-prompt-gaps/_artifacts/05-implement-report.md` — 后端权限已实现、前端未暴露
- `Reasonix/desktop/frontend/src/components/SettingsPanel.tsx` — `PermissionsSection` UI 参考（mode + allow/ask/deny 规则列表）
- `Reasonix/docs/SPEC.md` — `[permissions]` TOML 配置格式参考
- `src/components/workbench/SettingsPanel.vue` — 当前设置侧栏无 Permissions 页
- `src/types/axecoder.d.ts` — `AppSettings` 未包含权限字段
