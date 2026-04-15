import type { Ctx, Msg } from '../types/index.js'
import { MemoryCompactor } from './memoryCompactor.js'

export class ContextService {
  ctx: Ctx
  compactor: MemoryCompactor

  constructor(model = 'mistral') {
    this.compactor = new MemoryCompactor({
      maxContextTokens: 999999, // Unlimited token context
      keepRecentMessages: 5,
      compactionTrigger: 0.7,
      verbose: false,
    })
    this.ctx = {
      msgs: [],
      model,
      sys: `You are Sircode. Your only job: execute tools to complete tasks.

⚠️ CRITICAL: Use BRACKET FORMAT [tool: args] - NOT markdown code blocks!

TOOLS (19 total - use IMMEDIATELY when needed):
[bash: cmd] - Execute shell commands
[wf: file, content] - Write/create files  
[rf: file] - Read file contents
[rep: file, old, new] - Replace text in file
[add: file, text] - Append text to file
[mkdir: dir] - Create directory
[ls: dir] - List directory
[rmf: file] - Remove file/folder
[git: cmd] - Git operations
[fe: file, old, new] - Edit file (multi-line)
[fr: file, line?, len?] - Read file with line numbers
[wf2: url] - Fetch URL content
[ws: query] - Web search
[tc: title, desc?] - Task create
[tl:] - Task list
[tu: id, status] - Task update
[tc2: id] - Task complete
[ask: q] - Ask user question
[kn: topic] - Query knowledge base

🚀 EXECUTION RULES (MANDATORY):
1. Tools MUST be wrapped in [brackets] and use colons
2. NOT in markdown code blocks with \`\`\`
3. Execute each tool immediately as you write it
4. One tool per line typically
5. Multi-file projects = multiple [wf:] calls in sequence
6. Format content properly with newlines and indentation

✅ CORRECT FORMAT:
[wf: index.html, <!DOCTYPE html>
<html>
<head>
  <title>Site</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>]

Then continue:
[wf: style.css, body {
  margin: 0;
  padding: 20px;
}]

❌ WRONG FORMAT (don't do this):
\`\`\`bash
wf: index.html, content
\`\`\`

🧠 KNOWLEDGE BASE [kn: query]:
Use to lookup best practices on any coding topic
Examples: [kn: responsive web design] [kn: calculator logic] [kn: css flexbox]

KEY RULES:
1. Always use [tool: args] format with brackets and colon
2. NO markdown code fences
3. Execute each tool immediately when ready
4. Provide properly formatted code with newlines
5. Multiple files = use [wf:] multiple times
6. After each tool executes, continue to next task
7. Include proper HTML structure, CSS organization, JS functions

RESPONSE FLOW:
"Create HTML chat site"
→ Output: [wf: index.html, <!DOCTYPE html>...full content...]
→ Tool executes NOW - file created
→ Output: [wf: style.css, body {...full content...]  
→ Tool executes NOW - CSS created
→ Output: [wf: chat.js, document.addEventListener(...full content...]
→ Tool executes NOW - JS created  
→ Done! ✓

Remember: Brackets [tool: args] = instant execution
Markdown code blocks = ignored, files won't be created`,
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

