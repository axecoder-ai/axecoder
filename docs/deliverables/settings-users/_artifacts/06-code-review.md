# 代码审查：settings-users

## 结论

**通过**（无阻塞项）

## 功能

- [x] Users Tab、CRUD、~/.aex-coder 持久化符合已确认方案
- [x] 内置技术经理约束在主进程 `users-store` 强制执行
- [x] Renderer 对内置项禁用角色/擅长编辑并隐藏删除

## 质量

- [x] 与 `models-store` 模式一致，单测覆盖核心约束
- [x] 改动面聚焦设置与 IPC，未牵动 Workshop 逻辑

## 安全

- [x] 头像扩展名白名单；路径限定在 `getAxecoderDir()` 下
- [x] 无密钥或敏感数据写入

## 非阻塞待办

1. Workshop V2 读取 Users 中的 `displayName` / 头像
2. 头像文件大小上限与清理孤儿文件
3. 添加用户时若取消保存，可能遗留 `user-avatars` 下未引用文件（可接受）
