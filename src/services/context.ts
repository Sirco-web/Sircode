import type { Ctx, Msg } from '../types/index.js'

export class ContextService {
  ctx: Ctx

  constructor(model = 'mistral') {
    this.ctx = {
      msgs: [],
      model,
      sys: `You: Sircode AI assistant (Ollama). Help code: analyze, fix, explain, execute.
Brief. Terse. Code blocks. No fluff.`,
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
