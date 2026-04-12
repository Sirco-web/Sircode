import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname } from 'path'
import type { ToolRes } from '../types/index.js'

export class Exec {
  static cmd(cmd: string, to = 30000): ToolRes {
    const t0 = Date.now()
    try {
      const res = spawnSync('bash', ['-c', cmd], {
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
      return { ok: true, out: readFileSync(path, 'utf-8'), ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static write(path: string, content: string): ToolRes {
    const t0 = Date.now()
    try {
      const dir = dirname(path)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(path, content, 'utf-8')
      return { ok: true, out: `wrote: ${path}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static rep(path: string, old: string, neu: string): ToolRes {
    const t0 = Date.now()
    try {
      const txt = readFileSync(path, 'utf-8')
      if (!txt.includes(old)) return { ok: false, out: '', err: 'pattern not found', ms: Date.now() - t0 }
      const upd = txt.replace(old, neu)
      writeFileSync(path, upd, 'utf-8')
      return { ok: true, out: `replaced in: ${path}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static add(path: string, content: string): ToolRes {
    const t0 = Date.now()
    try {
      const dir = dirname(path)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const txt = existsSync(path) ? readFileSync(path, 'utf-8') : ''
      const upd = txt + (txt ? '\n' : '') + content
      writeFileSync(path, upd, 'utf-8')
      return { ok: true, out: `added to: ${path}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static rmf(path: string): ToolRes {
    const t0 = Date.now()
    try {
      if (!existsSync(path)) return { ok: false, out: '', err: 'not found', ms: Date.now() - t0 }
      rmSync(path, { recursive: true, force: true })
      return { ok: true, out: `removed: ${path}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static mkdir(path: string): ToolRes {
    const t0 = Date.now()
    try {
      if (!existsSync(path)) mkdirSync(path, { recursive: true })
      return { ok: true, out: `dir: ${path}`, ms: Date.now() - t0 }
    } catch (e) {
      return { ok: false, out: '', err: String(e), ms: Date.now() - t0 }
    }
  }

  static ls(dir: string): ToolRes {
    return this.cmd(`ls -lh "${dir}"`)
  }

  static git(...args: string[]): ToolRes {
    return this.cmd(`git ${args.join(' ')}`)
  }
}
