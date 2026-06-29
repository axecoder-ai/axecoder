# 代码审查

## 结论

**通过**（无阻塞项）

## 功能对照

| 需求 | 状态 |
|------|------|
| VS Code contributes 子集合并 | ✅ |
| 侧栏视图 webview 渲染 | ✅ explorer/search/scm |
| 命令 manifest 合并 | ✅ registerManifestCommands |
| 本系统 IPC 保留 | ✅ axecoder RPC 桥 |

## 质量

- 合并逻辑有单测；URL 解析有单测。
- `App.vue` 通过 `callSidebarView` 统一调用 iframe 方法，避免散落 ref。
- iframe `sandbox` 含 `allow-same-origin`（同源 MPA 所需）；仅加载本应用 bundle。

## 非阻塞待办

1. Chat / BottomPanel / Settings 迁入 webview bundle。
2. 主题 `contributes.themes` 动态注册 CSS（当前仍 `AppTheme` 枚举）。
3. 扩展启用/禁用 UI 与热加载。
4. 生产打包确认 `resources/` 在 asar 内可访问。

## 安全

- iframe RPC 仅响应来自已挂载 iframe 的 `message`（`ev.source === contentWindow`）。
- 未向 iframe 暴露 Node 集成。
