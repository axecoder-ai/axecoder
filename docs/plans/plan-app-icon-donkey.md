# WritCraft 应用图标（驴子形象）设计文档

> **来源素材：** 用户提供的卡通驴头 PNG（笑脸、长耳、粗描边）  
> **范围：** 将默认 Vite/Electron 占位图标替换为驴子形象，覆盖浏览器标签、Electron 窗口与安装包图标。  
> **约束：** 最小改动；不引入 UI 内嵌 Logo（TitleBar 等本期不改）；不实施代码，仅本文档指导后续落地。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `public/` 站点图标、`electron` 窗口 `icon`、`electron-builder` 打包图标；源图入库 |
| **不在范围** | TitleBar/关于页品牌图、macOS Dock 单独模板、动画图标、多主题变体 |
| **约束** | 保持现有 `index.html` / `electron/main/index.ts` 引用路径习惯；优先栅格导出，SVG 为可选增强 |
| **时间线（估）** | 素材整理 + 多尺寸导出 **0.25d** → 接入 public/Electron **0.25d** → builder 配置与实机验收 **0.25d**，合计 **约 0.75 人日** |

---

## 当前背景

- **系统：** WritCraft，Electron + Vue 3 + vite-plugin-electron。
- **现状：**
  - `index.html` 使用 `/logo.svg`（当前为 Vite 默认渐变闪电 Logo）。
  - `electron/main/index.ts` 引用 `favicon.ico`，但 `public/` 下**仅有** `logo.svg`，**无** `favicon.ico`（运行时可能回退或缺失）。
  - `package.json` 无 `build`（electron-builder）`icon` 配置，安装包仍用默认图标。
- **痛点：** 品牌与产品无关；窗口/安装包图标未统一；缺失 `favicon.ico` 与 Main 配置不一致。

---

## 需求

### 功能需求

- **F1 源图归档：** 将用户 PNG 复制到仓库固定路径（建议 `build/icon-source.png`），作为唯一母版，便于复现导出。
- **F2 浏览器图标：** 提供可在 `index.html` 引用的 favicon（`favicon.ico` 和/或 `favicon-32.png`）；替换或弃用现有 `logo.svg`。
- **F3 Electron 窗口：** `BrowserWindow` 的 `icon` 指向存在的 `public/favicon.ico`（或与 F2 一致的多尺寸 ICO）。
- **F4 安装包图标：** 为 `electron-builder` 提供标准母版 `build/icon.png`（**1024×1024**，正方形，透明或白底）；在 `package.json` 增加 `build.icon`（及 mac/win 默认扩展名规则）。
- **F5 小尺寸可读性：** 16×16 / 32×32 仍能辨认「驴头+耳」；必要时提供**裁切版**（仅头部、略放大）而非整图缩小。

### 非功能需求

- 母版 PNG 边长建议 ≥512px，导出 1024 时使用高质量缩放（Lanczos 或 macOS `sips`）。
- 仓库内图标二进制总量可控（ICO + PNG + icns 衍生，不提交重复冗余的 10+ 张预览图）。

### 集成点

| 消费方 | 路径/配置 |
|--------|-----------|
| Vite 静态资源 | `public/favicon.ico`、`public/favicon-32.png`（可选） |
| `index.html` | `<link rel="icon" …>` |
| Main 进程 | `electron/main/index.ts` → `VITE_PUBLIC/favicon.ico` |
| electron-builder | `package.json` → `"build": { "icon": "build/icon.png" }` |

---

## 设计决策

### 1. 以栅格母版为主，SVG 为可选

- **选择：** 从 PNG 导出 ICO/PNG/icns，不强制首期手描 SVG。
- **理由：** 用户素材已是完整插画，描 SVG 成本高；Electron/macOS 打包原生支持 PNG→icns/ico。
- **取舍：** 极小 favicon 可能略糊；若验收不达标再补一版「简化 SVG」或「仅头部裁切」母版。

### 2. 统一 ICO 路径，修复 Main 与 public 不一致

- **选择：** 生成 `public/favicon.ico`（含 16/32/48/256），Main 与 HTML 共用。
- **理由：** 与现有 `index.ts` 一致，改动一行 HTML 即可。
- **备选（不采用）：** 仅 PNG + 改 Main 为 `.png` — 需改代码且 Windows 任务栏更偏好 ICO。

### 3. electron-builder 使用 `build/icon.png` 约定

- **选择：** 1024×1024 `build/icon.png`，`package.json` 增加 `build` 字段。
- **理由：** app-builder 官方约定；一次配置 macOS `.icns`、Windows `.ico`、Linux 自动派生。
- **备选：** 仅手动放 `build/icon.icns` — 跨平台维护成本高。

### 4. 小图标策略：先整图，不达标再裁切

- **选择：** 默认以完整驴头为正方形画布（透明边距约 8–12%）；验收 16px 失败时，用裁切+放大头部作为 `icon-source-cropped.png` 重导。
- **理由：** 保留用户原画辨识度；迭代成本可控。

---

## 技术设计

### 1. 目标资源结构

```
build/
  icon-source.png      # 用户原图（入库）
  icon.png             # 1024×1024，electron-builder 母版
public/
  favicon.ico          # 多尺寸 ICO
  favicon-32.png       # 可选，现代浏览器
  logo.svg             # 删除或保留为 legacy（建议删除并改 index 引用）
```

### 2. 导出流水线（实施时用脚本或命令，无业务函数）

建议一次性 shell 流水（macOS 示例，实施阶段编写 `scripts/export-icons.sh` 亦可）：

1. 复制 Cursor 资产到 `build/icon-source.png`。
2. `sips -z 1024 1024` → `build/icon.png`（保持比例则先 pad 成正方形）。
3. 用 `png2icons` / ImageMagick / 在线工具 / `electron-icon-builder` 从 `build/icon.png` 生成 `public/favicon.ico`。
4. 可选：`sips` 导出 `public/favicon-32.png`。
5. `npm run build` 验证 `release/` 内 `.app` / `.dmg` 图标。

**母版路径（实施前复制）：**  
`.cursor/projects/Users-cuiyunfeng-workspace-WritCraft/assets/image-e6a2f5f9-1dcb-45b1-811b-a741d8b4d110.png`

### 3. 配置变更（唯一代码/配置改动集）

| 文件 | 说明 |
|------|------|
| `build/icon-source.png` | **新建**，源图 |
| `build/icon.png` | **新建**，1024 母版 |
| `public/favicon.ico` | **新建** |
| `public/favicon-32.png` | **新建**（可选） |
| `public/logo.svg` | **删除**或保留但不引用 |
| `index.html` | `link rel="icon"` 改为 `favicon.ico`（或 png） |
| `package.json` | 增加 `"build": { "icon": "build/icon.png", "productName": "WritCraft" }` 等最小字段 |
| `electron/main/index.ts` | 仅当改文件名时需要改路径（目标：仍用 `favicon.ico` 则**可不改**） |

**明确不改：** `FileExplorer.vue`、`TitleBar.vue`、业务 IPC、Chat/Agents。

---

## 实施计划

### 阶段一：素材与母版（约 0.25 人日）

1. 复制用户 PNG → `build/icon-source.png`。
2. 正方形画布（透明或 #FFFFFF 底，与深色 title bar 对比后定夺）。
3. 导出 `build/icon.png`（1024×1024）。

**验收：** 1024 图清晰、头部居中、四边留白适中。

### 阶段二：public + HTML（约 0.25 人日）

1. 生成 `public/favicon.ico`（含 16/32/48/256）。
2. 更新 `index.html` 的 favicon 引用；移除对旧 `logo.svg` 的依赖。
3. 确认 `public/` 与 `electron/main/index.ts` 路径一致。

**验收：** `npm run dev` 浏览器标签与 Electron 窗口标题栏旁图标为驴子；无 404。

### 阶段三：打包图标（约 0.25 人日）

1. `package.json` 增加 `build.icon`。
2. 执行 `npm run build`，检查 `release/` 下 macOS `.app` 与 Windows（如有）图标。
3. 若 16px 糊：回到阶段一用裁切母版重导。

**验收：** 安装包/Dock/任务栏显示驴子图标，非 Vite 默认。

---

## 测试策略

### 手工验收

1. 开发模式：浏览器 DevTools → Application → 无 favicon 404。
2. Electron 窗口图标（macOS 标题栏/Dock，Windows 任务栏）。
3. 生产构建：打开 `.app` / 安装包，图标一致。
4. 缩小到 16×16 目视仍可识别（或记录不达标并启用裁切版）。

---

## 可观测性

（不适用。）

---

## 后续考虑

### 潜在增强

- 手描简化 `public/logo.svg` 供高清屏与 CSS 着色。
- TitleBar 左侧 16px 品牌图标。
- 深色/浅色自适应 favicon。

### 已知限制

- 栅格缩小后牙齿等细节可能糊成色块。
- SVG 未做时，无法单文件多主题换色。

---

## 依赖

| 项 | 用途 |
|----|------|
| macOS `sips` / `iconutil` 或 ImageMagick | 缩放、ICNS（可选本地生成） |
| `electron-builder`（已有） | 从 `build/icon.png` 派生平台图标 |
| 可选：`png-to-ico`、`electron-icon-builder` | 一键 ICO（devDependency，实施时按需） |

---

## 安全考量

（不适用；静态图片，无用户数据。）

---

## 发布策略

1. 图标变更随下一版 `npm run build` 发布即可，无迁移。
2. 合并前在 macOS 实机看 Dock；若有 Windows CI 再补一项任务栏检查。

---

## 参考资料

- [electron-builder/icons](https://www.electron.build/icons.html)
- 现有 `index.html`、`electron/main/index.ts` 图标引用
- 源图：`.cursor/.../image-e6a2f5f9-1dcb-45b1-811b-a741d8b4d110.png`
