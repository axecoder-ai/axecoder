# 代码审查：全局搜索

**审查结论：通过**（本功能范围内；全仓 1 项无关既有单测失败待另修）

## 功能

- [x] 侧栏输入即搜、选项条、glob、替换与 VS Code 分工一致
- [x] 顶栏不再伪装搜索框
- [x] ⌘P / ⌘⇧F 快捷键与菜单注册
- [x] 搜索过期结果通过 `searchGen` 丢弃

## 质量

- [x] 搜索/替换核心逻辑抽到 `search-utils.ts` 可单测
- [x] i18n 中英文齐全
- [ ] 非阻塞：Replace 仅「全部替换」，无单次替换

## 安全

- [x] 替换前用户确认
- [x] 路径仍经 `isPathInsideRoot`（搜索侧 ripgrep + 既有 fs 约束）
- [x] 正则无效时 `replaceInLine` 静默跳过该行

## 阻塞项

无。

## 非阻塞待办

1. Quick Open 文件列表可做项目打开时缓存。
2. 修复无关单测 `sandbox-dispatch.test.ts`。
3. 二期可加替换预览（dry-run）。
