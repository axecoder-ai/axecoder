## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** 多进程多开 App，每进程不同项目，同项目互斥。
- **选定：** 提案 1 – 去全局单实例 + userData 文件锁（PID）
- **用户调整：** CLI 传项目路径；菜单「新建窗口」；同项目绝不允许两进程同时打开

### 最终方案

- 移除 `requestSingleInstanceLock`
- `userData/project-locks/<hash>.lock` 记录 `{ pid, rootPath, at }`
- `fs:openProject` 前 acquire；失败且 PID 存活 → 对话框拒绝
- 解析 `process.argv` 目录参数；`app:getStartupProjectPath`
- 菜单 File → New Window → `open -n` / detached spawn
- 退出时 release 当前持有锁
