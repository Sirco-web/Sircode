import { MemoryManager, CodeContext } from '../memory/manager.js'
import { MemoryCompactor } from '../services/memoryCompactor.js'

export interface Session {
  id: string
  model: string
  cwd: string
  start: number
  messages: number
  files_created: string[]
  files_modified: string[]
  tools_used: Map<string, number>
  errors: number
  negativeCount?: number
  compactions?: number
}

export class SessionCoordinator {
  mem: MemoryManager
  session: Session
  compactor: MemoryCompactor

  constructor(cwd = process.cwd(), model = 'mistral') {
    this.mem = new MemoryManager(cwd)
    this.compactor = new MemoryCompactor({
      maxContextTokens: 4000,
      keepRecentMessages: 5,
      compactionTrigger: 0.7,
      verbose: false,
    })
    this.session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      model,
      cwd,
      start: Date.now(),
      messages: 0,
      files_created: [],
      files_modified: [],
      tools_used: new Map(),
      errors: 0,
      compactions: 0,
    }
  }

  recordMessage() {
    this.session.messages++
    this.mem.record({
      type: 'session',
      content: `Message #${this.session.messages}`,
      metadata: { session: this.session.id },
    })
  }

  /**
   * Record context state to memory files
   * Called after each message to keep memory fresh
   */
  recordContextSnapshot(messages: any[]) {
    // Check if compaction is needed
    if (this.compactor.shouldCompact(messages)) {
      this.compactor.compact(messages)
      this.session.compactions = (this.session.compactions || 0) + 1
      
      this.mem.record({
        type: 'success',
        content: `Memory compacted (${this.session.compactions}x)`,
        metadata: { session: this.session.id },
      })
    }
  }

  recordTool(name: string, result: { ok: boolean; err?: string }) {
    const count = this.session.tools_used.get(name) || 0
    this.session.tools_used.set(name, count + 1)

    this.mem.record({
      type: result.ok ? 'success' : 'error',
      content: `Tool: ${name}`,
      metadata: { tool: name, session: this.session.id },
    })

    if (!result.ok) this.session.errors++
  }

  recordFileOp(type: 'create' | 'modify', path: string) {
    if (type === 'create') this.session.files_created.push(path)
    else this.session.files_modified.push(path)

    this.mem.record({
      type: 'success',
      content: `File ${type}: ${path}`,
      metadata: { file: path, op: type, session: this.session.id },
    })
  }

  recordInsight(content: string) {
    this.mem.record({
      type: 'insight',
      content,
      metadata: { session: this.session.id },
    })
  }

  close() {
    const duration = Date.now() - this.session.start
    const ctx: CodeContext = {
      cwd: this.session.cwd,
      model: this.session.model,
      session_id: this.session.id,
      files_created: this.session.files_created,
      files_modified: this.session.files_modified,
      tools_used: Array.from(this.session.tools_used.keys()),
      memory_entries: [],
    }

    this.mem.saveContext(ctx)
    this.mem.saveMetadata({
      last_session: this.session.id,
      last_duration: duration,
      total_messages: this.session.messages,
      total_errors: this.session.errors,
    })
  }

  getStats() {
    return {
      session: this.session,
      memory: this.mem.getStats(),
    }
  }
}
