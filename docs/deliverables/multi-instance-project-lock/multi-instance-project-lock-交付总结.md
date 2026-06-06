# multi-instance-project-lock 交付总结

| 任务名 | multi-instance-project-lock |
| 完成日期 | 2026-06-06 |
| 选定方案 | 提案 1 – 文件锁 + 去单实例 |
| 审查 | 通过 |
| 单测 | 426/426 全绿 |

---

## 1. 概述

多进程多开 App，每进程不同项目，**同项目路径禁止两进程同时打开**。用户选定提案 1，并要求 CLI、新建窗口菜单。

## 2. 方案摘要

移除 `requestSingleInstanceLock`；`project-locks` 文件锁 + PID 检测；`fs:openProject` 加锁；CLI `parseStartupProjectPath`；File → New Window。

## 3. 选型

推荐提案 1；用户确认 + CLI + 新建窗口 + 同项目互斥。

## 4–8. 实现 / 测试 / 审查

见 `_artifacts/05-*`、`06-code-review.md`。

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/project-lock.ts` | 新增 | 项目锁 |
| `electron/main/startup-args.ts` | 新增 | CLI 解析 |
| `electron/main/launch-new-instance.ts` | 新增 | 新进程 |
| `electron/main/index.ts` | 修改 | 去单实例、菜单、IPC |
| `electron/main/fs-ipc.ts` | 修改 | 打开前加锁 |
| `electron/preload/index.ts` | 修改 | getStartupProjectPath |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/FileExplorer.vue` | 修改 | 启动项优先 |
| `shared/i18n/locales/*.ts` | 修改 | projectLock 文案 |
| `tests/unittest/UT-multi-instance-project-lock/*` | 新增 | 单测 |

## 10. 遗留

- 重复打开同项目自动聚焦（提案 2）
- dev 多进程与 3344 说明

## 11. 附录

`_artifacts/` 内 00、02、proposal、plan、05、06。
