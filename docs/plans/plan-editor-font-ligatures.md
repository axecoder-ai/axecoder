# 关闭编辑器字体连字 设计文档

## 当前背景

- Monaco 编辑器启用 `fontLigatures: true`，JetBrains Mono 将 `!=` 渲染为 `≠`，易造成误读。

## 需求

### 功能需求

- 代码编辑器中比较、箭头类运算符以标准 ASCII/glyph 显示，不使用编程连字。

### 非功能需求

- 最小代码变更，不新增配置项。

## 设计决策

### 1. 连字策略

将 `fontLigatures` 设为 `false`：

- 与 VS Code 默认「禁用连字」的常见预期一致
- 避免新增 `AppConfig` 字段与 UI

## 技术设计

### 文件变更

- `src/components/workbench/MonacoEditor.vue` — `fontLigatures: false`

## 实施计划

1. 修改 `MonacoEditor.vue` 创建选项
2. 手动验证 Go 文件中 `!=` 显示
3. 运行 `npm test` 全量单测

## 测试策略

### 单元测试

- 不新增（行为为 Monaco 渲染层，无纯函数可测）；依赖现有套件回归。

## 发布策略

- 随下一次前端构建生效，无迁移。
