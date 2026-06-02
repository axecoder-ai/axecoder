import { dialog, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { UserSaveInput } from './users-types'
import {
  listUsers,
  saveUser,
  deleteUser,
  copyAvatarForUser,
  getUserAvatarDataUrl,
} from './users-store'

export const registerUsersIpc = (getMainWindow: () => BrowserWindow | null) => {
  ipcMain.handle('users:list', async () => listUsers())

  ipcMain.handle('users:save', async (_, input: UserSaveInput) => {
    try {
      return { ok: true as const, data: await saveUser(input) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('users:delete', async (_, id: string) => {
    try {
      return { ok: true as const, data: await deleteUser(id) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('users:getAvatarDataUrl', async (_, avatarPath: string) => {
    try {
      return { ok: true as const, dataUrl: await getUserAvatarDataUrl(avatarPath) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('users:pickAvatar', async (_, userId: string) => {
    try {
      const win = getMainWindow()
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Choose avatar',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      })
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true as const, cancelled: true as const }
      }
      const avatarPath = await copyAvatarForUser(userId, result.filePaths[0])
      const dataUrl = await getUserAvatarDataUrl(avatarPath)
      return { ok: true as const, cancelled: false as const, avatarPath, dataUrl }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
