import type { Ctx, Msg } from '../types/index.js'
import { MemoryCompactor } from './memoryCompactor.js'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export class ContextService {
  ctx: Ctx
  compactor: MemoryCompactor
  projectContext: string = '' // Rich context about project
  cwd: string

  constructor(model = 'mistral', cwd = process.cwd()) {
    this.cwd = cwd
    this.compactor = new MemoryCompactor({
      maxContextTokens: 999999, // Unlimited token context
      keepRecentMessages: 5,
      compactionTrigger: 0.7,
      verbose: false,
    })
    
    // Try to load project context from .code/ folder
    this.loadProjectContext()
    
    this.ctx = {
      msgs: [],
      model,
      sys: this.generateSystemPrompt(),
    }
  }

  /**
   * Load project context from .code/ folder
   * This gives the model awareness of the project's state, previous files, decisions
   */
  private loadProjectContext(): void {
    const codePath = join(this.cwd, '.code')
    
    try {
      // Try to load context.json with previous session info
      const contextPath = join(codePath, 'context.json')
      let contextInfo = ''
      
      if (existsSync(contextPath)) {
        try {
          const contextData = JSON.parse(readFileSync(contextPath, 'utf-8'))
          contextInfo = `
## PROJECT CONTEXT FROM .code/

**Previous Session:**
- Model: ${contextData.model}
- Created files: ${contextData.files_created?.length || 0}
  ${contextData.files_created?.map((f: string) => `  • ${f}`).join('\n') || '  (none)'}
- Modified files: ${contextData.files_modified?.length || 0}
  ${contextData.files_modified?.map((f: string) => `  • ${f}`).join('\n') || '  (none)'}
- Tools used: ${Object.entries(contextData.tools_used || {}).map(([k, v]) => `${k}(${v})`).join(', ') || 'none'}

**IMPORTANT:** This project has existing context and files. Reference them when appropriate.
`
        } catch {
          contextInfo = '\n## PROJECT CONTEXT\n(Previous session data unavailable)\n'
        }
      } else {
        contextInfo = '\n## PROJECT CONTEXT\n(First session - new project)\n'
      }
      
      this.projectContext = contextInfo
    } catch {
      this.projectContext = ''
    }
  }

  /**
   * Generate comprehensive system prompt with project context
   */
  private generateSystemPrompt(): string {
    return `You are Sircode, an autonomous AI assistant helping with this project.

${this.projectContext}

⚠️ CRITICAL: Use BRACKET FORMAT [tool: args] - NOT markdown code blocks!

## AVAILABLE TOOLS (use IMMEDIATELY):

### FILE OPERATIONS
[read: path] or [rf: path] - Read file
[read_lines: path, start, end] or [fr: path, start, end] - Read specific lines
[write: path, content] or [wf: path, content] - Create/overwrite file
[replace: path, old, new] or [fe: path, old, new] - Replace text in file
[append: path, line] or [add: path, line] - Append line to file
[list: path] or [ls: path] - List directory
[mkd: path] or [mkdir: path] - Create directory
[rm: path] or [rmf: path] - Remove file

### EXECUTION
[bash: cmd] or [sh: cmd] or [exec: cmd] - Execute shell command
[git: cmd] - Git operations

### WEB OPERATIONS [BLOCKS - WAITS FOR RESULT]
[fetch: url, optional_prompt] or [url: url, prompt] - Fetch URL content
[search: query, count] or [ws: query, count] - Web search

### TASK MANAGEMENT  
[task_new: title, desc] or [tc: title, desc] - Create task
[tasks:] or [tl:] - List tasks
[task_set: id, status] or [tu: id, status] - Update task
[task_done: id] or [tc2: id] - Mark complete
[tasks_clear:] or [tr:] - Clear all tasks

### USER INTERACTION [BLOCKS - WAITS FOR ANSWER]
[question: text] or [ask: text] - Ask user

### KNOWLEDGE
[know: query] or [kn: query] or [kb: query] - Query knowledge base

## EXECUTION RULES

1. Tools MUST be [brackets] with colon: [tool: args]
2. NOT in markdown code blocks with \`\`\`
3. Execute immediately when ready
4. Multi-file projects: use multiple [write:] calls
5. Properly format code with newlines/indentation
6. Web fetches and questions BLOCK - wait for results

✅ CORRECT:
[write: index.html, <!DOCTYPE html>
<html>
<body>Hello</body>
</html>]
[write: style.css, body { margin: 0; }]

❌ WRONG (don't do this):
\`\`\`bash
write: index.html, content
\`\`\`

## WORKFLOW

1. Read project context from this message
2. If project exists, reference previous work
3. For new requests, use tools to build/modify
4. Multiple tools can be called in sequence
5. Each tool executes when brackets close
6. Continue with next task after tool completes

## KEY BEHAVIORS

- If files exist from previous session, read them first
- Reference existing decisions and architecture
- Don't recreate what already exists (unless asked)
- Use project context to make informed choices
- Ask user before major changes
- Test/verify after each change

Remember: You have project history in .code/ - use it!`
  }

  /**
   * Static helper: Load project context from .code/ folder
   * Useful for server mode or other contexts where ContextService isn't fully initialized
   */
  static loadProjectContextForPrompt(cwd = process.cwd()): string {
    const codePath = join(cwd, '.code')
    
    try {
      const contextPath = join(codePath, 'context.json')
      
      if (existsSync(contextPath)) {
        try {
          const contextData = JSON.parse(readFileSync(contextPath, 'utf-8'))
          return `
## PROJECT CONTEXT FROM .code/

**Previous Session:**
- Model: ${contextData.model}
- Created files: ${contextData.files_created?.length || 0}
  ${contextData.files_created?.map((f: string) => `  • ${f}`).join('\n') || '  (none)'}
- Modified files: ${contextData.files_modified?.length || 0}
  ${contextData.files_modified?.map((f: string) => `  • ${f}`).join('\n') || '  (none)'}
- Tools used: ${Object.entries(contextData.tools_used || {}).map(([k, v]) => `${k}(${v})`).join(', ') || 'none'}

**IMPORTANT:** This project has existing context and files. Reference them when appropriate.
`
        } catch {
          return '\n## PROJECT CONTEXT\n(Previous session data unavailable)\n'
        }
      } else {
        return '\n## PROJECT CONTEXT\n(First session - new project)\n'
      }
    } catch {
      return ''
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

  /**
   * Check if compaction is needed and do it
   */
  checkAndCompact(): boolean {
    if (this.compactor.shouldCompact(this.ctx.msgs)) {
      this.compactor.compact(this.ctx.msgs)
      return true
    }
    return false
  }

  /**
   * Build selective context for small models
   * Only includes recent messages + relevant facts
   */
  async buildSelectiveContext(): Promise<Msg[]> {
    const { messages, metadata } = await this.compactor.buildSelectiveContext(
      this.ctx.msgs,
      this.ctx.msgs[this.ctx.msgs.length - 1]?.content || '',
    )

    // Inject metadata if available (long-term memory)
    if (metadata.trim()) {
      return [
        { role: 'system', content: this.ctx.sys },
        { role: 'system', content: `[LONG-TERM CONTEXT]\n${metadata}` },
        ...messages,
      ]
    }

    return [{ role: 'system', content: this.ctx.sys }, ...messages]
  }

  /**
   * Get layer memory structure
   */
  getLayerMemory() {
    return {
      ...this.compactor.getLayerMemory(),
      working: this.ctx.msgs.slice(-5),
    }
  }
}

