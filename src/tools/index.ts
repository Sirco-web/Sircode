import type { ToolRes } from '../types/index.js'
import { Exec } from '../services/executor.js'
import { fileEdit } from './fileEdit.js'
import { fileRead } from './fileRead.js'
import { webFetch } from './webFetch.js'
import { webSearch } from './webSearch.js'
import { askUser } from './askUser.js'
import { taskCreate, taskList, taskUpdate, taskComplete, taskReset } from './task.js'
import { knowledgeQuery } from './knowledge.js'

export interface Tool { name: string; desc: string; run(...args: string[]): ToolRes | Promise<ToolRes> }

/**
 * SIRCODE TOOL SYSTEM
 * 
 * All tools support both SHORT (cryptic) and LONG (descriptive) names
 * Use long names in system prompts, short names for power users
 */
export const TOOLS: Record<string, Tool> = {
  // ============================================================================
  // FILE READING & BROWSING
  // ============================================================================
  rf: { name: 'rf', desc: 'read file', run(...a) { return a[0] ? Exec.read(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  read: { name: 'read', desc: 'read file content', run(...a) { return a[0] ? Exec.read(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  
  fr: { name: 'fr', desc: 'read file (advanced)', run(...a) { 
    try { return { ok: true, out: JSON.stringify(fileRead(a[0], parseInt(a[1] || '1'), a[2] ? parseInt(a[2]) : null)), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  read_lines: { name: 'read_lines', desc: 'read file by line range', run(...a) { 
    try { return { ok: true, out: JSON.stringify(fileRead(a[0], parseInt(a[1] || '1'), a[2] ? parseInt(a[2]) : null)), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  
  // ============================================================================
  // FILE WRITING & EDITING
  // ============================================================================
  wf: { name: 'wf', desc: 'write file', run(...a) { return a[0] ? Exec.write(a[0], a.slice(1).join(' ')) : { ok: false, out: '', err: 'need path+content', ms: 0 } } },
  write: { name: 'write', desc: 'write/create file', run(...a) { return a[0] ? Exec.write(a[0], a.slice(1).join(' ')) : { ok: false, out: '', err: 'need path+content', ms: 0 } } },
  
  fe: { name: 'fe', desc: 'edit file (replace)', run(...a) { 
    try { return { ok: true, out: JSON.stringify(fileEdit(a[0], a[1], a[2], a[3] === 'true')), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  replace: { name: 'replace', desc: 'replace text in file', run(...a) { 
    try { return { ok: true, out: JSON.stringify(fileEdit(a[0], a[1], a[2], a[3] === 'true')), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  
  rep: { name: 'rep', desc: 'replace in file', run(...a) { return a[0] && a[1] && a[2] ? Exec.rep(a[0], a[1], a[2]) : { ok: false, out: '', err: 'need path+old+new', ms: 0 } } },
  
  add: { name: 'add', desc: 'add line to file', run(...a) { return a[0] ? Exec.add(a[0], a.slice(1).join(' ')) : { ok: false, out: '', err: 'need path+content', ms: 0 } } },
  append: { name: 'append', desc: 'append line to file', run(...a) { return a[0] ? Exec.add(a[0], a.slice(1).join(' ')) : { ok: false, out: '', err: 'need path+content', ms: 0 } } },
  
  // ============================================================================
  // FILE & DIRECTORY OPERATIONS
  // ============================================================================
  ls: { name: 'ls', desc: 'list dir', run(...a) { return Exec.ls(a[0] || '.') } },
  list: { name: 'list', desc: 'list directory contents', run(...a) { return Exec.ls(a[0] || '.') } },
  
  mkdir: { name: 'mkdir', desc: 'make dir', run(...a) { return a[0] ? Exec.mkdir(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  mkd: { name: 'mkd', desc: 'make directory', run(...a) { return a[0] ? Exec.mkdir(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  
  rmf: { name: 'rmf', desc: 'remove file', run(...a) { return a[0] ? Exec.rmf(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  rm: { name: 'rm', desc: 'remove file', run(...a) { return a[0] ? Exec.rmf(a[0]) : { ok: false, out: '', err: 'need path', ms: 0 } } },
  
  // ============================================================================
  // COMMAND EXECUTION & SHELL
  // ============================================================================
  bash: { name: 'bash', desc: 'run bash cmd', run(...a) { return Exec.cmd(a.join(' ')) } },
  sh: { name: 'sh', desc: 'execute shell command', run(...a) { return Exec.cmd(a.join(' ')) } },
  exec: { name: 'exec', desc: 'execute command', run(...a) { return Exec.cmd(a.join(' ')) } },
  
  // ============================================================================
  // GIT VERSION CONTROL
  // ============================================================================
  git: { name: 'git', desc: 'git cmd', run(...a) { return Exec.git(...a) } },
  
  // ============================================================================
  // WEB TOOLS (BLOCKING - MODEL WAITS FOR RESULT!)
  // ============================================================================
  url: { name: 'url', desc: 'fetch URL content [BLOCKS]', run(...a) { 
    return Promise.resolve(webFetch(a[0], a[1])).then(r => ({ ok: !r.error, out: JSON.stringify(r), err: r.error || '', ms: 0 }))
  }},
  fetch: { name: 'fetch', desc: 'fetch URL content [BLOCKS]', run(...a) { 
    return Promise.resolve(webFetch(a[0], a[1])).then(r => ({ ok: !r.error, out: JSON.stringify(r), err: r.error || '', ms: 0 }))
  }},
  
  ws: { name: 'ws', desc: 'web search', run(...a) { 
    return Promise.resolve(webSearch(a[0], a[1] ? parseInt(a[1]) : 5)).then(r => ({ ok: !r.error, out: JSON.stringify(r), err: r.error || '', ms: 0 }))
  }},
  search: { name: 'search', desc: 'search the web', run(...a) { 
    return Promise.resolve(webSearch(a[0], a[1] ? parseInt(a[1]) : 5)).then(r => ({ ok: !r.error, out: JSON.stringify(r), err: r.error || '', ms: 0 }))
  }},
  
  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  tc: { name: 'tc', desc: 'task create', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskCreate(a[0], a[1])), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  task_new: { name: 'task_new', desc: 'create new task', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskCreate(a[0], a[1])), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  
  tl: { name: 'tl', desc: 'task list', run() { 
    return { ok: true, out: JSON.stringify(taskList()), err: '', ms: 0 }
  }},
  tasks: { name: 'tasks', desc: 'list all tasks', run() { 
    return { ok: true, out: JSON.stringify(taskList()), err: '', ms: 0 }
  }},
  
  tu: { name: 'tu', desc: 'task update', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskUpdate(a[0], a[1] as any)), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  task_set: { name: 'task_set', desc: 'update task', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskUpdate(a[0], a[1] as any)), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  
  tc2: { name: 'tc2', desc: 'task complete', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskComplete(a[0])), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  task_done: { name: 'task_done', desc: 'mark task complete', run(...a) { 
    try { return { ok: true, out: JSON.stringify(taskComplete(a[0])), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  
  tr: { name: 'tr', desc: 'task reset', run() { 
    return { ok: true, out: JSON.stringify(taskReset()), err: '', ms: 0 }
  }},
  tasks_clear: { name: 'tasks_clear', desc: 'clear all tasks', run() { 
    return { ok: true, out: JSON.stringify(taskReset()), err: '', ms: 0 }
  }},
  
  // ============================================================================
  // USER INTERACTION
  // ============================================================================
  ask: { name: 'ask', desc: 'ask user question', run(...a) { 
    try { return { ok: true, out: JSON.stringify(askUser(a.join(' '))), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  question: { name: 'question', desc: 'ask user a question', run(...a) { 
    try { return { ok: true, out: JSON.stringify(askUser(a.join(' '))), err: '', ms: 0 } }
    catch (e) { return { ok: false, out: '', err: (e as Error).message, ms: 0 } }
  }},
  
  // ============================================================================
  // KNOWLEDGE BASE
  // ============================================================================
  kn: { name: 'kn', desc: 'query knowledge base', run(...a) { return knowledgeQuery(...a) }},
  kb: { name: 'kb', desc: 'query knowledge base', run(...a) { return knowledgeQuery(...a) }},
  know: { name: 'know', desc: 'search knowledge', run(...a) { return knowledgeQuery(...a) }},
}

export const ls = () => Object.values(TOOLS)
export const run = (name: string, ...args: string[]): ToolRes | Promise<ToolRes> => TOOLS[name]?.run(...args) ?? { ok: false, out: '', err: `no tool: ${name}`, ms: 0 }
