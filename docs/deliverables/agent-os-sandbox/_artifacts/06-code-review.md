# 代码审查：Agent OS 级沙箱

## 审查结论

**通过**（无阻塞项）

## 功能

- [x] macOS Seatbelt 经 `sandbox-exec` 包装 Bash/后台 Bash
- [x] execpolicy TOML 评估与 deny 即时拦截
- [x] arity 表 218 条、前缀匹配与上游用例对齐
- [x] cargo/npm SBPL 例外、`.axecoder` 只读保护

## 质量

- [x] 模块边界清晰（arity / matcher / execpolicy / seatbelt）
- [x] 单测 14 条新增用例，393 全绿
- [ ] 非阻塞：`agent-hooks.ts` 未接入沙箱（方案已标注二期）

## 安全

- [x] 默认 workspace-write + 无网络
- [x] execpolicy deny 在 tool 层与执行层双检
- [x] 无密钥硬编码；策略文件用户可控

## 非阻塞待办

1. 设置页暴露 `sandbox_mode` / `network_access`
2. hooks 命令执行同步 Seatbelt
3. Linux Landlock 移植（若需跨平台 OS 沙箱）
