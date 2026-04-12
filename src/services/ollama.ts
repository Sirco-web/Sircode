import type { Msg, OllamaRes, Opts } from '../types/index.js'

export class Ollama {
  url: string
  model: string

  constructor(model = 'mistral', url = 'http://localhost:11434') {
    this.model = model
    this.url = url
  }

  async ok(): Promise<boolean> {
    try { return (await fetch(`${this.url}/api/tags`)).ok } catch { return false }
  }

  async ls(): Promise<string[]> {
    try {
      const d = (await (await fetch(`${this.url}/api/tags`)).json()) as { models?: Array<{ name: string }> }
      return (d.models ?? []).map(m => m.name)
    } catch {
      return []
    }
  }

  async chat(msgs: Msg[], opts?: Opts): Promise<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 120000) // 2 min timeout
    
    try {
      const r = await fetch(`${this.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: msgs,
          stream: false,
          keep_alive: '5m',
        }),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)
      
      if (!r.ok) throw new Error(`Ollama: ${r.status}`)
      const data = (await r.json()) as OllamaRes
      if (!data.message?.content) throw new Error('No response from model')
      return data.message.content
    } catch (e) {
      clearTimeout(timeout)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Request timeout - model took too long to respond')
      }
      throw e
    }
  }

  async *stream(msgs: Msg[], opts?: Opts): AsyncGenerator<string> {
    const r = await fetch(`${this.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: msgs, stream: true, options: opts }),
    })
    if (!r.ok) throw new Error(`Ollama: ${r.status}`)
    const reader = r.body?.getReader()
    if (!reader) return
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        try {
          const d = JSON.parse(lines[i]!) as OllamaRes
          if (d.message?.content) yield d.message.content
        } catch {}
      }
      buf = lines[lines.length - 1]!
    }
  }

  set(m: string) { this.model = m }
  get() { return this.model }
}
