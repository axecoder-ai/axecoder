# 代码审查 — user-skills

**审查范围：** 步骤 5 全部代码与测试变更，对照已确认方案与实施计划。

## 功能

- [x] `skillSlugs` 持久化与设置页多选符合需求
- [x] Workshop member/execute 模式注入 prompt 块
- [x] 无效 slug 静默跳过，不阻断发言
- [x] 内置经理 role/expertise 约束未破坏，skillSlugs 可编辑

## 代码质量

- [x] 复用 `discoverSkills` / `discoverCustomCommands`，无重复扫描逻辑（`listAvailableSkills` 独立模块）
- [x] `enrichRoleSpeakInputWithSkills` 在 agent/subagent speaker 共用
- [ ] 非阻塞：`resolveUserSkillPromptBlock` 对每个 slug 重复 discover，成员多 skill 时略冗余（V1 可接受）

## 安全

- [x] 仅读取已有 Skill/command 文件，无任意路径写入
- [x] slug 来自用户配置 + 发现列表，无注入风险

## 阻塞项

无。

## 非阻塞待办

1. Users 列表行展示 Skill 数量徽章（方案待解决问题）
2. 缓存 discover 结果以减少 Workshop 多成员连续发言时的 IO
3. 手工 E2E：设置页勾选 → Workshop 成员发言验证 prompt（待补充）

## 审查结论

**通过**
