import type { Ctx, Msg } from '../types/index.js'

export class ContextService {
  ctx: Ctx

  constructor(model = 'mistral') {
    this.ctx = {
      msgs: [],
      model,
      sys: `You are Sircode, an AI coding assistant with access to tools.
Always use tools to accomplish tasks. Format: [tool: args]

Available tools:
- [bash: command] - Execute shell command
- [wf: path, content] - Write file (creates/overwrites)
- [add: path, content] - Append line to file
- [rep: path, old, new] - Replace text in file
- [rf: path] - Read file
- [mkdir: path] - Create directory
- [ls: path] - List directory (default: current)
- [rmf: path] - Remove file
- [git: args...] - Git command

Rules:
1. For code generation, ALWAYS write files using [wf: path, code]
2. After file operations, confirm what was done
3. Be concise and direct
4. Use multiple tool calls if needed`,
    }
  }

  add(role: 'user'|'assistant'|'system', content: string) {
    this.ctx.msgs.push({ role, content })
  }

  get() { return this.ctx.msgs }

  forAPI(): Msg[] {
    return [{ role: 'system', content: this.ctx.sys }, ...this.ctx.msgs]
  }

  clear() { this.ctx.msgs = [] }

  setSys(s: string) { this.ctx.sys = s }
}
