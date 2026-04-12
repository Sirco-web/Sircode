import type { ToolRes } from '../types/index.js'
import { Exec } from '../services/executor.js'
import { fileEdit } from './fileEdit.js'
import { fileRead } from './fileRead.js'
import { webFetch } from './webFetch.js'
import { webSearch } from './webSearch.js'
import { taskCreate, taskList, taskUpdate } from './tasks.js'

export interface Tool { name: string; desc: string; run(...args: string[]): ToolRes | Promise<ToolRes> }

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
  // Advanced tools from Claude Code
  fe: { name: 'fe', desc: 'edit file (advanced)', run(...a) { 
    try { return { ok: true, out: JSON.stringify(fileEdit(a[0], a[1], a[2], a[3] === 'true')), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  fr: { name: 'fr', desc: 'read file (advanced)', run(...a) { 
    try { return { ok: true, out: JSON.stringify(fileRead(a[0], parseInt(a[1] || '1'), a[2] ? parseInt(a[2]) : null)), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  wf2: { name: 'wf2', desc: 'web fetch', run(...a) { 
    return Promise.resolve(webFetch(a[0], a[1])).then(r => ({ ok: !r.error, out: JSON.stringify(r), err: r.error || '', ms: 0 }))
  }},
  ws: { name: 'ws', desc: 'web search', run(...a) { 
    return Promise.resolve(webSearch(a[0], a[1] ? parseInt(a[1]) : 5)).then(r => ({ ok: !r.error, out: JSON.stringify(r), err: r.error || '', ms: 0 }))
  }},
  tc: { name: 'tc', desc: 'task create', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskCreate(a[0], a[1])), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  tl: { name: 'tl', desc: 'task list', run() { 
    return { ok: true, out: JSON.stringify(taskList()), err: '', ms: 0 }
  }},
  tu: { name: 'tu', desc: 'task update', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskUpdate(a[0], a[1] as any)), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
}

export const ls = () => Object.values(TOOLS)
export const run = (name: string, ...args: string[]): ToolRes | Promise<ToolRes> => TOOLS[name]?.run(...args) ?? { ok: false, out: '', err: `no tool: ${name}`, ms: 0 }
