import { spawn } from 'node:child_process'
import type { GhAuthStatus } from './forge-types'

const whichGh = (): Promise<boolean> =>
  new Promise((resolve) => {
    const proc = spawn('which', ['gh'], { stdio: 'ignore' })
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })

/** CC `getGhAuthStatus` — 检测 gh 安装与本地认证 */
export const getGhAuthStatus = async (): Promise<GhAuthStatus> => {
  const hasGh = await whichGh()
  if (!hasGh) return 'not_installed'

  return new Promise((resolve) => {
    const proc = spawn('gh', ['auth', 'token'], {
      stdio: 'ignore',
      env: process.env,
    })
    proc.on('close', (code) => {
      resolve(code === 0 ? 'authenticated' : 'not_authenticated')
    })
    proc.on('error', () => resolve('not_authenticated'))
  })
}
