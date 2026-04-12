import type { ToolRes } from '../types/index.js'
import { Exec } from '../services/executor.js'

export interface Tool { name: string; desc: string; run(...args: string[]): ToolRes }

export const TOOLS: Record<string, Tool> = {
  bash: { name: 'bash', desc: 'run bash cmd', run(...a) { return Exec.cmd(a.join(' ')) } },
  rf: { name: 'rf', desc: 'read file', run(...a) { return a[0] ? Exec.read(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  wf: { name: 'wf', desc: 'write file', run(...a) { return a[0] ? Exec.write(a[0], a.slice(1).join(' ')) : { ok: false, out: '', err: 'need path+content', ms: 0 } } },
  rep: { name: 'rep', desc: 'replace in file', run(...a) { return a[0] && a[1] && a[2] ? Exec.rep(a[0], a[1], a[2]) : { ok: false, out: '', err: 'need path+old+new', ms: 0 } } },
  add: { name: 'add', desc: 'add line to file', run(...a) { return a[0] ? Exec.add(a[0], a.slice(1).join(' ')) : { ok: false, out: '', err: 'need path+content', ms: 0 } } },
  ls: { name: 'ls', desc: 'list dir', run(...a) { return Exec.ls(a[0] || '.') } },
  rmf: { name: 'rmf', desc: 'remove file', run(...a) { return a[0] ? Exec.rmf(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  mkdir: { name: 'mkdir', desc: 'make dir', run(...a) { return a[0] ? Exec.mkdir(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  git: { name: 'git', desc: 'git cmd', run(...a) { return Exec.git(...a) } },
}

export const ls = () => Object.values(TOOLS)
export const run = (name: string, ...args: string[]): ToolRes => TOOLS[name]?.run(...args) ?? { ok: false, out: '', err: `no tool: ${name}`, ms: 0 }
