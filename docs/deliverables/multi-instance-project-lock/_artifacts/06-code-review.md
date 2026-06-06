# 代码审查

## 结论：通过

## 功能

- 多进程多开、不同项目、同项目互斥均已覆盖。
- CLI + New Window + openProject 三条路径均走 `acquireProjectLock`。

## 非阻塞

- 陈旧锁依赖 PID 检测；极端崩溃场景可能需 TTL（后续）。
- 同项目重复打开不聚焦已有窗口（提案 2 范围）。
