# 代码审查

## 结论

**通过**

## 功能

- [x] macOS Seatbelt 路径未破坏，seatbelt 单测回归通过
- [x] Linux bwrap 参数对齐 DeepSeek `bwrap.rs` 核心结构
- [x] Windows 不误报 sandboxed
- [x] read-only / danger-full-access / enabled=false 分支覆盖单测

## 质量

- [x] 模块职责清晰：seatbelt / bwrap / dispatch 分离
- [x] 复用 `getWritableRoots` 保持 /tmp 与 .axecoder 只读子路径一致

## 安全

- [x] 无新增命令注入面（bwrap 参数来自 canonical path + 固定 flag）
- [x] 无 secrets 暴露

## 非阻塞待办

1. Plan 模式 → read-only 沙箱映射（tool-executor 传 mode）
2. 设置页暴露 sandbox 模式 / prefer_bwrap
3. hooks 脚本同步沙箱（agent-os-sandbox 遗留）
4. Linux 无 bwrap 时的用户提示（doctor/日志）
