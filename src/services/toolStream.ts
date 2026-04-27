import { run as runTool } from '../tools/index.js'
import chalk from 'chalk'

export interface ToolCall {
  tool: string
  args: string[]
  fullText: string
}

/**
 * Stream-based tool parser and executor
 * Parses [tool: args] as it arrives, executes immediately when brackets close
 */
export class ToolStreamExecutor {
  private buffer = ''
  private inBracket = false
  private bracketStart = 0
  private sessionCoord: any
  private fmt: any

  constructor(sessionCoord: any, fmt: any) {
    this.sessionCoord = sessionCoord
    this.fmt = fmt
  }

  /**
   * Process a chunk of text from the stream
   * Returns newly executable tools found in this chunk
   */
  processChunk(chunk: string): ToolCall[] {
    this.buffer += chunk
    const newTools: ToolCall[] = []

    let i = 0
    while (i < this.buffer.length) {
      if (this.buffer[i] === '[' && !this.inBracket) {
        this.inBracket = true
        this.bracketStart = i
      } else if (this.buffer[i] === ']' && this.inBracket) {
        const toolText = this.buffer.substring(this.bracketStart + 1, i)
        const tool = this.parseTool(toolText)

        if (tool) {
          const fullText = this.buffer.substring(this.bracketStart, i + 1)
          newTools.push({ ...tool, fullText })
        }

        this.inBracket = false
        // Remove the bracket segment from the buffer so the next `]` in this chunk is parsed.
        // (The old indexOf(lastTool.fullText) approach failed for multi-line wf, so tools
        // only "appeared" at stream end via flush() + parse().)
        const end = i + 1
        this.buffer = this.buffer.slice(0, this.bracketStart) + this.buffer.slice(end)
        i = Math.max(0, this.bracketStart - 1)
      }
      i++
    }

    return newTools
  }

  /**
   * Parse tool from text like "bash: echo hello" or "wf: index.html, <html>...</html>"
   * Handles multi-line content with proper comma-based argument splitting
   */
  private parseTool(toolText: string): { tool: string; args: string[] } | null {
    const trimmed = toolText.trim()
    const colonIdx = trimmed.indexOf(':')
    
    if (colonIdx === -1) return null

    const tool = trimmed.substring(0, colonIdx).trim()
    const content = trimmed.substring(colonIdx + 1).trim()

    // Validate tool name
    if (!/^[a-z0-9_]+$/.test(tool)) return null

    // Parse arguments based on tool type
    if (['wf', 'add'].includes(tool)) {
      // Format: wf: filepath, content
      const commaIdx = content.indexOf(',')
      if (commaIdx > 0) {
        const filepath = content.substring(0, commaIdx).trim()
        const fileContent = content.substring(commaIdx + 1).trim()
        return {
          tool,
          args: [filepath, fileContent]
        }
      }
      return null
    } else if (['fe', 'rep'].includes(tool)) {
      // Format: fe: filepath, oldtext, newtext
      // Find first two commas carefully (old and new might have commas)
      const firstComma = content.indexOf(',')
      if (firstComma === -1) return null
      
      const filepath = content.substring(0, firstComma).trim()
      const remaining = content.substring(firstComma + 1)
      
      // Find second comma
      const secondComma = remaining.indexOf(',')
      if (secondComma === -1) return null
      
      const oldText = remaining.substring(0, secondComma).trim()
      const newText = remaining.substring(secondComma + 1).trim()
      
      return {
        tool,
        args: [filepath, oldText, newText]
      }
    } else if (tool === 'bash') {
      // bash: command (no argument parsing needed)
      return {
        tool,
        args: [content]
      }
    } else if (['rf', 'fr'].includes(tool)) {
      // rf: filepath [offset] [limit]
      const args = content.split(',').map(a => a.trim()).filter(a => a)
      return args.length > 0 ? {
        tool,
        args
      } : null
    } else if (['ws', 'wf2'].includes(tool)) {
      // ws: search query [maxresults]
      const args = content.split(',').map(a => a.trim()).filter(a => a)
      return args.length > 0 ? {
        tool,
        args
      } : null
    }

    // Default: split by comma
    const args = content.split(',').map(a => a.trim()).filter(a => a)
    return args.length > 0 ? { tool, args } : null
  }

  /**
   * Execute a tool immediately with live output
   */
  async executeTool(call: ToolCall): Promise<string> {
    try {
      // Show executing indicator
      console.log(chalk.dim(`  → ${call.tool} ${call.args[0] || ''}`))
      
      const res = await Promise.resolve(runTool(call.tool, ...call.args))
      const output = this.fmt.res(call.tool, res)
      
      // Record in session
      if (this.sessionCoord) {
        this.sessionCoord.recordTool(call.tool, res)
        if (call.tool === 'wf' || call.tool === 'fe') {
          this.sessionCoord.recordFileOp('create', call.args[0])
        }
        if (call.tool === 'rep' || call.tool === 'add') {
          this.sessionCoord.recordFileOp('modify', call.args[0])
        }
      }

      console.log(output)
      return output
    } catch (e) {
      const err = chalk.red(`✗ ${e instanceof Error ? e.message : String(e)}`)
      console.error(err)
      return err
    }
  }

  /**
   * Get any remaining unparsed buffer
   */
  flush(): string {
    return this.buffer
  }
}
