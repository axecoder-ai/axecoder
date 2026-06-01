# 选型记录：settings-users

## 2a 选型摘要

### 一句话需求回顾

在设置面板新增 **Users** 页签，将用户档案（头像、姓名、角色、擅长领域）持久化到 `~/.aex-coder`；内置 **技术经理** 不可改角色/不可删，可改昵称与头像；支持添加其他用户。

### 方案对比表

| 维度 | 提案 1 `users.json` + UsersTab | 提案 2 并入 `config.json` + Base64 |
|------|-------------------------------|-------------------------------------|
| 核心思路 | 独立 `users.json` + 头像目录，对齐 Models | 单文件 config 内嵌用户与头像 |
| 主要改动范围 | users-store、users-ipc、UsersTab | 扩展 config-store、UsersTab |
| 优点 | 可测、可扩展、配置不膨胀 | 改动面最小 |
| 缺点 / 风险 | 需头像 IPC | JSON 过大、与 models 策略不一致 |
| 工作量（粗估） | 中 | 小 |
| 适合场景 | 长期维护、多用户 | 极简 PoC |

### 关键差异说明

- 选提案 1：头像与元数据分离，重启与导出更稳。
- 选提案 2：实现快但 config 臃肿，不利于 Workshop 后续引用。
- 内置技术经理两方案均可在 store 层约束。
- V1 默认不强制 Workshop 读 Users（提案 1 标注为 P1）。

### 推荐方案

**推荐：提案 1 – `users.json` + 头像文件目录 + UsersTab**

与现有 `models.json` / `axecoder-dir` 一致，单测边界清晰，符合用户「在 ~/.aex-coder 配置」的表述。

### 选型提示

已通过选择题确认；细节见 `docs/proposals/proposal-settings-users.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – `users.json` + 头像文件目录 + UsersTab
- **调整说明：** 无额外调整，按方案实施
