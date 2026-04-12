import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface MemoryEntry {
  id: string
  timestamp: number
  type: 'session' | 'insight' | 'tool_result' | 'error' | 'success'
  content: string
  metadata: Record<string, unknown>
}

export interface CodeContext {
  cwd: string
  model: string
  session_id: string
  files_created: string[]
  files_modified: string[]
  tools_used: string[]
  memory_entries: MemoryEntry[]
}

export class MemoryManager {
  cwd: string
  codedir: string

  constructor(cwd = process.cwd()) {
    this.cwd = cwd
    this.codedir = join(cwd, '.code')
    this.init()
  }

  init() {
    if (!existsSync(this.codedir)) {
      mkdirSync(this.codedir, { recursive: true })
      this.saveMetadata({ version: '1.0', created: new Date().toISOString() })
    }
  }

  record(entry: Omit<MemoryEntry, 'id' | 'timestamp'>) {
    const e: MemoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      ...entry,
    }
    this.appendLog('memory.jsonl', JSON.stringify(e))
    return e
  }

  saveContext(ctx: CodeContext) {
    writeFileSync(join(this.codedir, 'context.json'), JSON.stringify(ctx, null, 2))
  }

  loadContext(): CodeContext | null {
    const p = join(this.codedir, 'context.json')
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
  }

  saveMetadata(data: Record<string, unknown>) {
    const p = join(this.codedir, 'metadata.json')
    const existing = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}
    writeFileSync(p, JSON.stringify({ ...existing, ...data }, null, 2))
  }

  getStats() {
    const p = join(this.codedir, 'memory.jsonl')
    if (!existsSync(p)) return { total: 0, by_type: {}, tools: new Set(), files: new Set() }

    const lines = readFileSync(p, 'utf8').split('\n').filter(Boolean)
    const stats = { total: 0, by_type: {} as Record<string, number>, tools: new Set<string>(), files: new Set<string>() }

    lines.forEach(line => {
      try {
        const e = JSON.parse(line) as MemoryEntry
        stats.total++
        stats.by_type[e.type] = (stats.by_type[e.type] || 0) + 1
        if (e.metadata.tool) stats.tools.add(String(e.metadata.tool))
        if (e.metadata.file) stats.files.add(String(e.metadata.file))
      } catch {}
    })
    return stats
  }

  private appendLog(file: string, line: string) {
    const p = join(this.codedir, file)
    const content = existsSync(p) ? readFileSync(p, 'utf8') : ''
    writeFileSync(p, content + (content ? '\n' : '') + line)
  }

  consolidateMemory() {
    const p = join(this.codedir, 'memory.jsonl')
    if (!existsSync(p)) return

    const lines = readFileSync(p, 'utf8').split('\n').filter(Boolean)
    const entries = lines.map(l => JSON.parse(l) as MemoryEntry)

    // Group by type and summarize
    const summary = {
      total_events: entries.length,
      date_range: entries.length > 0 ? [entries[0].timestamp, entries[entries.length - 1].timestamp] : [],
      by_type: {} as Record<string, number>,
      insights: [] as string[],
    }

    entries.forEach(e => {
      summary.by_type[e.type] = (summary.by_type[e.type] || 0) + 1
      if (e.type === 'insight') summary.insights.push(e.content)
    })

    writeFileSync(join(this.codedir, 'summary.json'), JSON.stringify(summary, null, 2))
  }
}
