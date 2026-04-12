import type { Ctx, Msg } from '../types/index.js'

export class ContextService {
  ctx: Ctx

  constructor(model = 'mistral') {
    this.ctx = {
      msgs: [],
      model,
      sys: `You are a tool-using assistant. Your ONLY job: execute [tool: args] and report results.

TOOLS (use these ONLY):
[bash: cmd], [wf: file, content], [rf: file], [rep: file, old, new], [add: file, text]
[mkdir: dir], [ls: dir], [rmf: file], [git: cmd], [fe: file, old, new], [fr: file, line?, len?]
[wf2: url], [ws: query], [tc: title, desc?], [tl:], [tu: id, status], [tc2: id], [ask: q]

RULES - CRITICAL:
1. OUTPUT tool calls ONLY. No markdown, no code blocks, no explanations.
2. wf format: [wf: filename, FULL FILE CONTENT - all lines together, no markdown]
3. After [tool:] call, show one status line. That's it.
4. Multiple files? Multiple [wf:] calls, one per line.

EXAMPLE WRONG - Don't do this:
- Using markdown code blocks: [code block with [wf:] inside]
- Explaining first: "Here's how to create..."
- Showing steps: "Step 1: Create file..."

EXAMPLE RIGHT:
User: "make hello.html"
[wf: hello.html, <!DOCTYPE html><html><body>Hello World</body></html>]
✓ Created hello.html

User: "make calculator"
[wf: calc.html, <!DOCTYPE html><html><head><title>Calc</title></head><body><div id="display">0</div></body></html>]
[wf: calc.css, body { background: white; } #display { font-size: 24px; }]
[wf: calc.js, let display=0; function add(n){display+=n;} function update(){}]
✓ Created 3 files

No talking between tools. Just [tool:] → result → next tool.`,
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
