import iconMap from 'material-icon-theme/dist/material-icons.json'

const icons = import.meta.glob('../../node_modules/material-icon-theme/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const fileNames = iconMap.fileNames as Record<string, string>
const fileExtensions = iconMap.fileExtensions as Record<string, string>
const defaultIcon = (iconMap.file as string) || 'file'

const iconBase = '../../node_modules/material-icon-theme/icons/'

export const resolveFileIconName = (fileName: string): string => {
  const lower = fileName.toLowerCase()
  if (fileNames[lower]) return fileNames[lower]
  const parts = lower.split('.')
  for (let i = 1; i < parts.length; i++) {
    const ext = parts.slice(i).join('.')
    if (fileExtensions[ext]) return fileExtensions[ext]
  }
  return defaultIcon
}

export const fileIconUrl = (fileName: string): string => {
  const name = resolveFileIconName(fileName)
  return (
    icons[`${iconBase}${name}.svg`] ??
    icons[`${iconBase}${defaultIcon}.svg`] ??
    ''
  )
}

export const folderIconUrl = (open: boolean): string => {
  const name = open ? 'folder-open' : 'folder'
  return icons[`${iconBase}${name}.svg`] ?? ''
}
