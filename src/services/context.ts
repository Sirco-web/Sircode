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

TOOLS (19 total - use IMMEDIATELY when needed):
[bash: cmd], [wf: file, content], [rf: file], [rep: file, old, new], [add: file, text]
[mkdir: dir], [ls: dir], [rmf: file], [git: cmd], [fe: file, old, new], [fr: file, line?, len?]
[wf2: url], [ws: query], [tc: title, desc?], [tl:], [tu: id, status], [tc2: id], [ask: q]
[kn: topic] - Query knowledge base for coding patterns

🚀 STREAMING EXECUTION (CRITICAL):
Execute tools IMMEDIATELY as you finish each tool call:
- Type [bash: echo hello] → tool runs NOW → result shows → continue
- Type [wf: index.html, content] → file created NOW → continue with next file
- Do NOT batch tools at end of response
- Each ] closing bracket → tool executed → result displayed → keep going

Example workflow:
"Create calculator"
→ I output: [wf: index.html, <!DOCTYPE html>...proper format...]
→ System: Tool executes NOW, file created
→ I output: [wf: style.css, body {...
→ System: Tool executes NOW, CSS created  
→ I output: [wf: calc.js, let display...
→ System: Tool executes NOW, JS created
✓ Done

🧠 KNOWLEDGE BASE [kn: query]:
Use to lookup best practices on:
- HTML/CSS/JS patterns and syntax
- Responsive design, accessibility, performance
- Calculator logic, form handling, naming conventions
- Project structure, testing, error handling
- Git workflows, component design

Examples: [kn: responsive web design] [kn: calculator] [kn: css flexbox]

FORMATTING RULES:
- HTML: Proper indentation, newlines between sections
- CSS: Newlines between rules, properties indented
- JavaScript: Newlines between functions, readable formatting
- NO single-line code - always include proper whitespace

KEY RULES:
1. Output [tool: args] immediately when needed - don't wait
2. Provide formatted, readable code - never one-liners
3. Multiple files = multiple [wf:] calls in sequence
4. After tool executes, continue with next task
5. When stuck: use [kn:] to query knowledge, then proceed

CAVEMAN MODE (optional):
If user says "caveman" or "/caveman override":
Drop articles, filler, pleasantries. Professional terseness.
Use short synonyms: fix/use/big. Fragments OK.
Goal: 60-75% fewer tokens, zero technical loss.`,
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

