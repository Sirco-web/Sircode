/**
 * Memory Compactor System
 * Auto-compacts context when it reaches 70% of max tokens
 * 3-layer memory: working → context → long-term
 * Prevents context overflow while preserving critical info
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Msg } from '../types/index.js'

export interface CompactionConfig {
  maxContextTokens: number // When to trigger compaction (~70%)
  keepRecentMessages: number // Always keep last N messages raw
  memoryDir: string // Where to save memory files (.code/)
  compactionTrigger: number // Percentage (0-1) to trigger at
  verbose: boolean
}

export interface LayerMemory {
  working: Msg[] // Last N messages (raw)
  context: string // Summarized current state
  longterm: string // Important facts
}

export interface CompactionReport {
  triggered: boolean
  messagesRemoved: number
  tokensSaved: number
  oldTokens: number
  newTokens: number
  timeMs: number
}

export class MemoryCompactor {
  private config: CompactionConfig
  private estimatedTokenCount = 0

  constructor(config: Partial<CompactionConfig> = {}) {
    this.config = {
      maxContextTokens: 4000, // 70% of ~6K typical limit
      keepRecentMessages: 5,
      memoryDir: path.join(process.cwd(), '.code'),
      compactionTrigger: 0.7,
      verbose: false,
      ...config,
    }

    // Ensure memory directory exists
    if (!fs.existsSync(this.config.memoryDir)) {
      fs.mkdirSync(this.config.memoryDir, { recursive: true })
    }
  }

  /**
   * Estimate tokens in messages (rough: ~1 token per 4 chars)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Check if context should be compacted
   */
  shouldCompact(messages: Msg[]): boolean {
    const tokens = messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0)
    this.estimatedTokenCount = tokens

    const shouldTrigger = tokens > this.config.maxContextTokens * this.config.compactionTrigger

    if (this.config.verbose && shouldTrigger) {
      console.log(
        `  📦 Compaction triggered: ${tokens} tokens (threshold: ${this.config.maxContextTokens * this.config.compactionTrigger})`,
      )
    }

    return shouldTrigger
  }

  /**
   * Compact messages: keep recent raw, summarize old
   */
  compact(messages: Msg[]): CompactionReport {
    const start = Date.now()
    const oldTokens = this.estimatedTokenCount

    // Split into old and recent
    const recentCount = Math.min(this.config.keepRecentMessages, messages.length)
    const recent = messages.slice(-recentCount)
    const old = messages.slice(0, messages.length - recentCount)

    // Summarize old messages
    const summary = this.summarizeOldMessages(old)

    // Save summary to memory file
    this.saveMemoryFile('history.log', summary)

    // Extract important facts to long-term memory
    const facts = this.extractLongTermFacts(old)
    this.saveMemoryFile('memory.md', facts)

    // Build new context with summary + recent
    const contextContent = `# Current Context\n\nCompacted at: ${new Date().toISOString()}\n\n## Summary\n\n${summary}\n\n## Recent Messages\n\n${recent.map((m) => `**${m.role}:** ${m.content}`).join('\n\n')}`

    this.saveMemoryFile('context.md', contextContent)

    const newTokens = this.estimateTokens(contextContent) + recentCount * 50
    const timeMs = Date.now() - start

    if (this.config.verbose) {
      console.log(
        `  ✅ Compaction complete: ${oldTokens} → ${newTokens} tokens (saved ${oldTokens - newTokens})`,
      )
    }

    return {
      triggered: true,
      messagesRemoved: old.length,
      tokensSaved: oldTokens - newTokens,
      oldTokens,
      newTokens,
      timeMs,
    }
  }

  /**
   * Summarize old messages, keeping crucial info
   */
  private summarizeOldMessages(messages: Msg[]): string {
    let summary = '## Conversation Summary\n\n'

    // Group by role and extract key points
    const userMessages = messages.filter((m) => m.role === 'user')
    const assistantMessages = messages.filter((m) => m.role === 'assistant')

    if (userMessages.length > 0) {
      summary += `### User Requests (${userMessages.length})\n\n`
      // Keep first 2 and last request
      const shown = [userMessages[0], ...(userMessages.length > 3 ? [userMessages[userMessages.length - 1]] : [])]
      for (const msg of shown) {
        const preview = msg.content.slice(0, 100).replace(/\n/g, ' ')
        summary += `- ${preview}...\n`
      }
      if (userMessages.length > 3) {
        summary += `- _(${userMessages.length - 2} more requests)_\n`
      }
      summary += '\n'
    }

    if (assistantMessages.length > 0) {
      summary += `### Key Responses\n\n`
      // Keep decisions and code snippets
      for (const msg of assistantMessages.slice(-3)) {
        if (msg.content.includes('{') || msg.content.includes('```')) {
          const preview = msg.content.slice(0, 80).replace(/\n/g, ' ')
          summary += `- Code/Config: ${preview}...\n`
        } else if (msg.content.toLowerCase().includes('decision') || msg.content.toLowerCase().includes('important')) {
          summary += `- ${msg.content.slice(0, 100)}\n`
        }
      }
    }

    return summary
  }

  /**
   * Extract important long-term facts
   */
  private extractLongTermFacts(messages: Msg[]): string {
    let facts = '# Long-Term Memory\n\n'
    facts += `_Last updated: ${new Date().toISOString()}_\n\n`

    const allText = messages.map((m) => m.content).join('\n')

    // Extract decisions
    const decisions: string[] = []
    if (allText.toLowerCase().includes('decide')) {
      decisions.push('Agent made architecture decisions')
    }
    // Extract patterns
    if (allText.includes('function') || allText.includes('class')) {
      decisions.push('Code structure established')
    }
    if (allText.includes('error') || allText.includes('bug')) {
      decisions.push('Known issues and fixes applied')
    }

    if (decisions.length > 0) {
      facts += '## Decisions\n\n'
      facts += decisions.map((d) => `- ${d}`).join('\n')
      facts += '\n\n'
    }

    facts += '## Project State\n\n'
    facts += '- Memory compaction active\n'
    facts += '- Context management enabled\n'
    facts += `- Messages processed: ${messages.length}\n`

    return facts
  }

  /**
   * Build selective context (only load what's needed)
   */
  async buildSelectiveContext(
    messages: Msg[],
    currentRequest: string,
  ): Promise<{ messages: Msg[]; metadata: string }> {
    const recent = messages.slice(-this.config.keepRecentMessages)

    // Load relevant long-term facts
    const longTermFacts = this.loadMemoryFile('memory.md')
    const contextFile = this.loadMemoryFile('context.md')

    // Combine: long-term + context + recent
    const metadata = contextFile ? `${contextFile}\n\n${longTermFacts || ''}` : longTermFacts || ''

    return {
      messages: recent,
      metadata,
    }
  }

  /**
   * Save to memory file
   */
  private saveMemoryFile(filename: string, content: string): void {
    const filepath = path.join(this.config.memoryDir, filename)
    try {
      fs.writeFileSync(filepath, content, 'utf8')
    } catch (e) {
      if (this.config.verbose) {
        console.warn(`  ⚠️ Failed to save ${filename}:`, e instanceof Error ? e.message : String(e))
      }
    }
  }

  /**
   * Load from memory file
   */
  private loadMemoryFile(filename: string): string {
    const filepath = path.join(this.config.memoryDir, filename)
    try {
      if (fs.existsSync(filepath)) {
        return fs.readFileSync(filepath, 'utf8')
      }
    } catch (e) {
      if (this.config.verbose) {
        console.warn(`  ⚠️ Failed to load ${filename}:`, e instanceof Error ? e.message : String(e))
      }
    }
    return ''
  }

  /**
   * Get current layer memory
   */
  getLayerMemory(): LayerMemory {
    return {
      working: [], // Populated by caller
      context: this.loadMemoryFile('context.md'),
      longterm: this.loadMemoryFile('memory.md'),
    }
  }

  /**
   * Write current session state to task file
   */
  saveTaskState(tasks: string[], currentTask?: string): void {
    let content = '# Current Tasks\n\n'
    if (currentTask) {
      content += `**Active:** ${currentTask}\n\n`
    }
    content += '## Todo\n\n'
    content += tasks.map((t) => `- [ ] ${t}`).join('\n')
    this.saveMemoryFile('tasks.md', content)
  }

  /**
   * Clear all memory files
   */
  clearMemory(): void {
    const files = ['context.md', 'memory.md', 'history.log', 'tasks.md']
    for (const file of files) {
      const filepath = path.join(this.config.memoryDir, file)
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath)
        }
      } catch (e) {
        if (this.config.verbose) {
          console.warn(`  ⚠️ Failed to delete ${file}`)
        }
      }
    }
  }
}
