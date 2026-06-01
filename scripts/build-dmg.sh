#!/usr/bin/env bash
# AxeCoder 打 macOS DMG 包（与 npm run build 相同）
set -e

# 进到项目根目录
cd "$(dirname "$0")/.."

echo "=== 开始打包 AxeCoder ==="
echo "目录: $(pwd)"
echo ""

# 类型检查 + Vite 构建 + electron-builder（dmg + zip）
npm run build

# 读 package.json 里的版本号
VERSION=$(node -p "require('./package.json').version")

echo ""
echo "=== 打包完成 ==="
echo "输出目录: release/${VERSION}/"
echo ""

# 列出 dmg
ls -lh "release/${VERSION}/"*.dmg
