import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, resolve } from 'path'
import type { ToolRes } from '../types/index.js'

const userCwd = process.env.USER_CWD || process.cwd()

export class Exec {
  static resolvePath(p: string): string {
    // If path is absolute, use as-is; otherwise resolve from user's directory
    if (p.startsWith('/')) return p
    return resolve(userCwd, p)
  }

  static cmd(cmd: string, to = 30000): ToolRes {
    const t0 = Date.now()
    try {
      const res = spawnSync('bash', ['-c', cmd], {
        cwd: userCwd,
        encoding: 'utf-8',
        timeout: to,
        maxBuffer: 10 * 1024 * 1024,
      })
      const ms = Date.now() - t0
      if (res.error) return { ok: false, out: res.stderr || '', err: res.error.message, ms }
      return {
        ok: res.status === 0,
        out: (res.stdout || '') + (res.stderr ? `\nstderr: ${res.stderr}` : ''),
        ms,
      }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static read(path: string): ToolRes {
    const t0 = Date.now()
    try {
      const p = Exec.resolvePath(path)
      return { ok: true, out: readFileSync(p, 'utf-8'), ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static write(path: string, content: string): ToolRes {
    const t0 = Date.now()
    try {
      const p = Exec.resolvePath(path)
      const dir = dirname(p)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(p, content, 'utf-8')
      return { ok: true, out: `wrote: ${p}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static rep(path: string, old: string, neu: string): ToolRes {
    const t0 = Date.now()
    try {
      const p = Exec.resolvePath(path)
      const txt = readFileSync(p, 'utf-8')
      if (!txt.includes(old)) return { ok: false, out: '', err: 'pattern not found', ms: Date.now() - t0 }
      const upd = txt.replace(old, neu)
      writeFileSync(p, upd, 'utf-8')
      return { ok: true, out: `replaced in: ${p}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static add(path: string, content: string): ToolRes {
    const t0 = Date.now()
    try {
      const p = Exec.resolvePath(path)
      const dir = dirname(p)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const txt = existsSync(p) ? readFileSync(p, 'utf-8') : ''
      const upd = txt + (txt ? '\n' : '') + content
      writeFileSync(p, upd, 'utf-8')
      return { ok: true, out: `added to: ${p}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static rmf(path: string): ToolRes {
    const t0 = Date.now()
    try {
      const p = Exec.resolvePath(path)
      if (!existsSync(p)) return { ok: false, out: '', err: 'not found', ms: Date.now() - t0 }
      rmSync(p, { recursive: true, force: true })
      return { ok: true, out: `removed: ${p}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static mkdir(path: string): ToolRes {
    const t0 = Date.now()
    try {
      const p = Exec.resolvePath(path)
      if (!existsSync(p)) mkdirSync(p, { recursive: true })
      return { ok: true, out: `dir: ${p}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static ls(dir: string): ToolRes {
    const p = Exec.resolvePath(dir)
    return this.cmd(`ls -lh "${p}"`)
  }

  static git(...args: string[]): ToolRes {
    return this.cmd(`git ${args.join(' ')}`)
  }
}
