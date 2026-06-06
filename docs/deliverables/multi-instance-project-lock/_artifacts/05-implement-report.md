# 功能实现报告

## 功能说明

- **移除全局单实例锁**：可启动多个独立 AxeCoder OS 进程。
- **项目文件锁**：`userData/project-locks/<sha256>.lock` 记录 PID；打开项目前 acquire，同项目且对方进程存活则弹窗拒绝。
- **CLI**：`AxeCoder /path/to/project` 启动时自动打开该目录（优先于「最近项目」）。
- **菜单**：File → New Window（⌘⇧N / Ctrl+Shift+N）通过 `open -n`（macOS）或 detached spawn 启动新进程。
- **退出**：`confirmQuit` 时释放当前进程持有的项目锁。

## 修改文件

见交付总结变更清单。

## 单测

`normalizeProjectRoot`、`projectLockKey`、`isPidAlive`、`parseStartupProjectPath`。

## 注意事项

- dev 模式多进程共用 Vite 3344；打包后无此问题。
- 重复打开同项目仅提示，不自动聚焦另一进程（提案 1 范围）。
