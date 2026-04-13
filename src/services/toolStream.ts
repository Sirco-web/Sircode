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
  private executableTools: ToolCall[] = []
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
        // Found closing bracket - extract and parse tool
        const toolText = this.buffer.substring(this.bracketStart + 1, i)
        const tool = this.parseTool(toolText)
        
        if (tool) {
          const fullTool: ToolCall = {
            ...tool,
            fullText: this.buffer.substring(this.bracketStart, i + 1)
          }
          newTools.push(fullTool)
          this.executableTools.push(fullTool)
        }
        
        this.inBracket = false
      }
      i++
    }

    // Remove processed tools from buffer
    if (this.executableTools.length > 0) {
      const lastTool = this.executableTools[this.executableTools.length - 1]
      const endIdx = this.buffer.indexOf(lastTool.fullText) + lastTool.fullText.length
      if (endIdx > 0) {
        this.buffer = this.buffer.substring(endIdx)
      }
    }

    return newTools
  }

  /**
   * Parse tool from text like "bash: echo hello" or "wf: index.html, <html>...</html>"
   */
  private parseTool(toolText: string): { tool: string; args: string[] } | null {
    const match = /^([a-z_]+):\s*(.*)$/s.exec(toolText.trim())
    if (!match) return null

    const tool = match[1]
    const content = match[2]

    if (['wf', 'fe', 'rep', 'add'].includes(tool)) {
      // Special parsing for file tools
      if (tool === 'wf' || tool === 'add') {
        const commaIdx = content.indexOf(',')
        if (commaIdx > -1) {
          return {
            tool,
            args: [content.slice(0, commaIdx).trim(), content.slice(commaIdx + 1).trim()]
          }
        }
      } else if (tool === 'rep' || tool === 'fe') {
        const parts = content.split(',')
        if (parts.length >= 3) {
          return {
            tool,
            args: [parts[0].trim(), parts[1].trim(), parts.slice(2).join(',').trim()]
          }
        }
      }
    }

    return {
      tool,
      args: content.split(',').map(a => a.trim()).filter(a => a)
    }
  }

  /**
   * Execute a tool immediately
   */
  async executeTool(call: ToolCall): Promise<string> {
    try {
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
