#!/usr/bin/env bash
# AxeCoder 打 Windows x64 zip（解压后运行 AxeCoder.exe，免安装）
# 可在 macOS 上交叉编译；若失败请在 Windows 本机或 CI 执行本脚本。
set -e

# 进到项目根目录
cd "$(dirname "$0")/.."

echo "=== 开始打包 Windows zip ==="
echo "目录: $(pwd)"
echo ""
echo "产物用法: 将 zip 发给 Windows 用户，解压后双击 AxeCoder.exe"
echo ""

# 若项目根目录有已下载的 electron zip，放入缓存避免重复下载
ELECTRON_ZIP="electron-v29.4.6-win32-x64.zip"
if [ -f "$ELECTRON_ZIP" ]; then
  mkdir -p "$HOME/Library/Caches/electron"
  cp -f "$ELECTRON_ZIP" "$HOME/Library/Caches/electron/$ELECTRON_ZIP"
  echo "已使用本地 Electron: $ELECTRON_ZIP"
fi
echo ""

# 交叉编译时不做 Windows 代码签名（避免拉取 winCodeSign）
export CSC_IDENTITY_AUTO_DISCOVERY=false

# 类型检查
npx vue-tsc --noEmit

# 构建前端与 Electron 主进程/预加载
npx vite build

# 只打 Windows x64 zip（不打 mac dmg）
npx electron-builder --win zip --x64

# 读版本号
VERSION=$(node -p "require('./package.json').version")

echo ""
echo "=== 打包完成 ==="
echo "输出目录: release/${VERSION}/"
echo ""

# 列出 zip（文件名含 win 或 Setup 等，以实际为准）
ls -lh "release/${VERSION}/"*win*.zip 2>/dev/null || ls -lh "release/${VERSION}/"*.zip
