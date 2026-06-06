# multi-instance-project-lock 设计文档

## 实施计划

1. `project-lock.ts` — normalize、acquire、release、isPidAlive
2. `startup-args.ts` — 解析 CLI 项目目录
3. `launch-new-instance.ts` — 新建进程
4. `index.ts` — 去单实例；quit 释放锁；IPC startup path
5. `fs-ipc.ts` — openProject 加锁与对话框
6. File 菜单 New Window
7. FileExplorer — 启动项优先于 last project
8. i18n + 单测

## 文件变更

- `electron/main/project-lock.ts`（新）
- `electron/main/startup-args.ts`（新）
- `electron/main/launch-new-instance.ts`（新）
- `electron/main/index.ts`
- `electron/main/fs-ipc.ts`
- `electron/preload/index.ts`
- `src/types/axecoder.d.ts`
- `src/components/workbench/FileExplorer.vue`
- `shared/i18n/locales/*.ts`
- `tests/unittest/UT-multi-instance-project-lock/*`
