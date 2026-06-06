import type { ITheme } from '@xterm/xterm'
import type { AppTheme } from '../types/axecoder'

const cssVar = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

const darkAnsi: Pick<
  ITheme,
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite'
> = {
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
}

const lightAnsi: Pick<
  ITheme,
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite'
> = {
  black: '#000000',
  red: '#cd3131',
  green: '#107c10',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
}

export const terminalThemeFor = (theme: AppTheme = 'vscode'): ITheme => {
  const isLight = theme === 'aura-light'
  const ansi = isLight ? lightAnsi : darkAnsi
  return {
    background: cssVar('--wc-panel', isLight ? '#f5f5f5' : '#1e1e1e'),
    foreground: cssVar('--wc-text', isLight ? '#333333' : '#cccccc'),
    cursor: cssVar('--wc-text', isLight ? '#333333' : '#cccccc'),
    selectionBackground: cssVar('--wc-search-match-hl-bg', isLight ? 'rgba(37, 99, 235, 0.28)' : '#264f78'),
    ...ansi,
  }
}
