# 调研链接

- `electron/main/index.ts:51-54` — `requestSingleInstanceLock()` 阻止第二进程启动
- `electron/main/index.ts:403-408` — `second-instance` 仅聚焦已有主窗
- `electron/main/fs-ipc.ts:161-180` — `fs:openProject` 无项目占用检查
- `electron/preload/index.ts` — `openProject` / `getLastProject`
- 调研缺口：无 CLI 打开项目路径；无跨进程项目锁
