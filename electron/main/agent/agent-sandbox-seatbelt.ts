import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const SANDBOX_EXEC_PATH = '/usr/bin/sandbox-exec'

export type SandboxMode = 'workspace-write' | 'read-only' | 'danger-full-access'

export type WritableRoot = {
  root: string
  readOnlySubpaths: string[]
}

const SEATBELT_BASE_POLICY = `
(version 1)
(deny default)

; Core process operations
(allow process-exec)
(allow process-fork)
(allow signal (target same-sandbox))
(allow process-info* (target same-sandbox))

; User preferences (needed by many CLI tools)
(allow user-preference-read)

; Basic I/O to /dev/null
(allow file-write-data
  (require-all
    (path "/dev/null")
    (vnode-type CHARACTER-DEVICE)))

; System information
(allow sysctl-read)

; IPC primitives
(allow ipc-posix-sem)
(allow ipc-posix-shm-read*)
(allow ipc-posix-shm-write-create)
(allow ipc-posix-shm-write-data)
(allow ipc-posix-shm-write-unlink)

; Terminal support (essential for shell commands)
(allow pseudo-tty)
(allow file-read* file-write* file-ioctl (literal "/dev/ptmx"))
(allow file-read* file-write* file-ioctl (literal "/dev/tty"))
(allow file-read* file-write* file-ioctl (regex #"^/dev/ttys[0-9]+$"))

; macOS-specific device access
(allow file-read* (literal "/dev/urandom"))
(allow file-read* (literal "/dev/random"))
(allow file-ioctl (literal "/dev/dtracehelper"))

; Mach IPC (needed by many system services)
(allow mach-lookup)
`

const SEATBELT_NETWORK_POLICY = `
; Network access
(allow network-outbound)
(allow network-inbound)
(allow system-socket)
(allow network-bind)
`

const canonicalPath = (p: string): string => {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

const resolveCargoHome = (): string | null => {
  const explicit = process.env.CARGO_HOME?.trim()
  if (explicit) return explicit
  const home = process.env.HOME
  if (!home) return null
  return path.join(home, '.cargo')
}

const resolveNpmCacheDir = (): string | null => {
  const explicit = process.env.NPM_CONFIG_CACHE?.trim()
  if (explicit) return explicit
  const home = process.env.HOME
  if (!home) return null
  return path.join(home, '.npm')
}

const getDarwinUserCacheDir = (): string | null => {
  const home = process.env.HOME
  if (home) return path.join(home, 'Library', 'Caches')
  return null
}

export const getWritableRoots = (cwd: string, mode: SandboxMode): WritableRoot[] => {
  if (mode === 'read-only' || mode === 'danger-full-access') return []
  const roots: string[] = [cwd]
  try {
    roots.push(canonicalPath('/tmp'))
  } catch {
    /* ignore */
  }
  const tmpdir = process.env.TMPDIR
  if (tmpdir) {
    try {
      roots.push(canonicalPath(tmpdir))
    } catch {
      roots.push(tmpdir)
    }
  }
  const seen = new Set<string>()
  const out: WritableRoot[] = []
  for (const root of roots) {
    const canon = canonicalPath(root)
    if (seen.has(canon)) continue
    seen.add(canon)
    const readOnlySubpaths: string[] = []
    const axecoderDir = path.join(canon, '.axecoder')
    if (fs.existsSync(axecoderDir) && fs.statSync(axecoderDir).isDirectory()) {
      readOnlySubpaths.push(canonicalPath(axecoderDir))
    }
    out.push({ root: canon, readOnlySubpaths })
  }
  return out
}

const generateWritePolicy = (writableRoots: WritableRoot[]): string => {
  if (writableRoots.length === 0) return ''
  const policies: string[] = []
  writableRoots.forEach((root, index) => {
    const rootParam = `WRITABLE_ROOT_${index}`
    if (root.readOnlySubpaths.length === 0) {
      policies.push(`(subpath (param "${rootParam}"))`)
      return
    }
    const parts = [`(subpath (param "${rootParam}"))`]
    root.readOnlySubpaths.forEach((_, subIndex) => {
      parts.push(`(require-not (subpath (param "WRITABLE_ROOT_${index}_RO_${subIndex}")))`)
    })
    policies.push(`(require-all ${parts.join(' ')})`)
  })
  return `(allow file-write*\n  ${policies.join('\n  ')})`
}

const generateParams = (writableRoots: WritableRoot[]): Array<[string, string]> => {
  const params: Array<[string, string]> = []
  writableRoots.forEach((root, index) => {
    params.push([`WRITABLE_ROOT_${index}`, root.root])
    root.readOnlySubpaths.forEach((sub, subIndex) => {
      params.push([`WRITABLE_ROOT_${index}_RO_${subIndex}`, sub])
    })
  })
  const cacheDir = getDarwinUserCacheDir()
  if (cacheDir) params.push(['DARWIN_USER_CACHE_DIR', cacheDir])
  const cargoHome = resolveCargoHome()
  if (cargoHome) {
    const canon = canonicalPath(cargoHome)
    params.push(['CARGO_HOME_REGISTRY', path.join(canon, 'registry')])
    params.push(['CARGO_HOME_GIT', path.join(canon, 'git')])
    params.push(['CARGO_HOME', canon])
  }
  const npmCache = resolveNpmCacheDir()
  if (npmCache) params.push(['NPM_CACHE_DIR', canonicalPath(npmCache)])
  return params
}

export const generateSeatbeltPolicy = (
  cwd: string,
  mode: SandboxMode = 'workspace-write',
  networkAccess = false,
): string => {
  let full = SEATBELT_BASE_POLICY
  full += '\n; Full filesystem read access\n(allow file-read*)'
  const writableRoots = getWritableRoots(cwd, mode)
  const writePolicy = mode === 'read-only' ? '' : generateWritePolicy(writableRoots)
  if (writePolicy) {
    full += '\n\n; Write access policy\n'
    full += writePolicy
  }
  if (networkAccess) full += SEATBELT_NETWORK_POLICY
  full += '\n\n; Darwin user cache directory\n'
  full += '(allow file-read* file-write* (subpath (param "DARWIN_USER_CACHE_DIR")))'
  full += '\n\n; Common macOS directories\n'
  full += '(allow file-read* (subpath "/usr/lib"))\n'
  full += '(allow file-read* (subpath "/usr/share"))\n'
  full += '(allow file-read* (subpath "/System/Library"))\n'
  full += '(allow file-read* (subpath "/Library/Preferences"))\n'
  full += '(allow file-read* (subpath "/private/var/db"))'
  if (resolveCargoHome()) {
    full += '\n\n; Cargo home\n'
    full += '(allow file-read* (subpath (param "CARGO_HOME")))'
    if (mode !== 'read-only') {
      full += '\n(allow file-write* (subpath (param "CARGO_HOME_REGISTRY")))'
      full += '\n(allow file-write* (subpath (param "CARGO_HOME_GIT")))'
    }
  }
  if (resolveNpmCacheDir()) {
    full += '\n\n; npm cache\n'
    full += '(allow file-read* (subpath (param "NPM_CACHE_DIR")))'
    if (mode !== 'read-only') {
      full += '\n(allow file-write* (subpath (param "NPM_CACHE_DIR")))'
    }
  }
  return full
}

export const createSeatbeltArgs = (
  innerProgram: string,
  innerArgs: string[],
  cwd: string,
  mode: SandboxMode = 'workspace-write',
  networkAccess = false,
): string[] => {
  const policy = generateSeatbeltPolicy(cwd, mode, networkAccess)
  const writableRoots = getWritableRoots(cwd, mode)
  const params = generateParams(writableRoots)
  const args = ['-p', policy]
  for (const [key, value] of params) {
    args.push(`-D${key}=${value}`)
  }
  args.push('--', innerProgram, ...innerArgs)
  return args
}

let seatbeltAvailable: boolean | null = null

export const isSeatbeltAvailable = (): boolean => {
  if (process.platform !== 'darwin') return false
  if (seatbeltAvailable !== null) return seatbeltAvailable
  if (!fs.existsSync(SANDBOX_EXEC_PATH)) {
    seatbeltAvailable = false
    return false
  }
  try {
    const r = spawnSync(SANDBOX_EXEC_PATH, ['-p', '(version 1)(allow default)', '--', '/usr/bin/true'], {
      timeout: 5000,
    })
    seatbeltAvailable = r.status === 0
  } catch {
    seatbeltAvailable = false
  }
  return seatbeltAvailable
}

export const detectSeatbeltDenial = (exitCode: number | null, stderr: string): boolean => {
  if (exitCode === 0) return false
  return /Sandbox:\s+.+\s+denied/i.test(stderr) || /operation not permitted/i.test(stderr)
}
