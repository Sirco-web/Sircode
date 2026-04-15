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
    const timeout = setTimeout(() => ctrl.abort(), 600000) // 10 min timeout for CPU models
    
    try {
      const r = await fetch(`${this.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: msgs,
          stream: false,
          keep_alive: '10m',
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
        throw new Error('Request timeout (10min)')
      }
      throw e
    }
  }

  async *streamChat(msgs: Msg[], opts?: Opts): AsyncGenerator<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 600000) // 10 min timeout
    
    try {
      const r = await fetch(`${this.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: msgs,
          stream: true,
          keep_alive: '10m',
        }),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)
      
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
    } catch (e) {
      clearTimeout(timeout)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Stream timeout (10min)')
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

  /**
   * Pull a model from registry (automatic download)
   */
  async pull(model: string): Promise<void> {
    try {
      const r = await fetch(`${this.url}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
      })

      if (!r.ok) {
        throw new Error(`Failed to pull model ${model}: ${r.status} ${r.statusText}`)
      }

      await r.json()
    } catch (e) {
      throw e instanceof Error ? e : new Error(`Failed to pull model: ${String(e)}`)
    }
  }

  /**
   * Stream model pull progress
   */
  async *streamPull(model: string): AsyncGenerator<string> {
    try {
      const r = await fetch(`${this.url}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: true }),
      })

      if (!r.ok) {
        throw new Error(`Failed to pull model ${model}: ${r.status}`)
      }

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
            const line = lines[i]!
            if (line.trim()) {
              yield line
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        buf = lines[lines.length - 1]!
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error(`Stream pull error: ${String(e)}`)
    }
  }

  set(m: string) { this.model = m }
  get() { return this.model }
}
