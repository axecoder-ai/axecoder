import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  fs.rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG
  const devPort = (() => {
    try {
      return Number(new URL(pkg.debug.env.VITE_DEV_SERVER_URL).port) || 3344
    } catch {
      return 3344
    }
  })()

  const opencodeSymlink = path.resolve(__dirname, 'opencode')
  const opencodeDenyPaths = [opencodeSymlink]
  try {
    if (fs.existsSync(opencodeSymlink)) {
      opencodeDenyPaths.push(fs.realpathSync(opencodeSymlink))
    }
  } catch {
    // 符号链接不存在或无法解析时忽略
  }

  return {
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'shared'),
      },
    },
    // 只从 AxeCoder 的 index.html 扫描依赖，避免扫到根目录 opencode 符号链接里的 Solid 项目
    optimizeDeps: {
      entries: [path.resolve(__dirname, 'index.html')],
    },
    server: isServe
      ? {
          host: '127.0.0.1',
          port: devPort,
          strictPort: false,
          fs: {
            // 项目根目录的 opencode 符号链接，避免 Vite 扫描外部 monorepo
            deny: opencodeDenyPaths,
          },
          watch: {
            ignored: ['**/opencode/**'],
          },
        }
      : undefined,
    plugins: [
      vue(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main/index.ts',
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App')
            } else {
              startup()
            }
          },
          vite: {
            resolve: {
              alias: {
                '@shared': path.resolve(__dirname, 'shared'),
              },
            },
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
                // we can use `external` to exclude them to ensure they work correctly.
                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                // Of course, this is not absolute, just this way is relatively simple. :)
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        // Polyfill the Electron and Node.js API for Renderer process.
        // If you want to use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
    ],
    clearScreen: false,
  }
})
