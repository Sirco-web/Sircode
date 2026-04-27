import type { Msg, OllamaRes, Opts } from '../types/index.js'

export class Ollama {
  url: string
  model: string
  isSircodeServer: boolean

  constructor(model = 'mistral', url = 'http://localhost:11434') {
    this.model = model
    this.url = url.replace(/\/$/, '') // Remove trailing slash
    
    // Detect if this is a Sircode Server (not standard Ollama)
    // Sircode Server runs on 8093 or other ports, never 11434
    // Standard Ollama runs on 11434
    const urlObj = new URL(this.url)
    this.isSircodeServer = urlObj.port !== '11434' && !urlObj.hostname.includes('localhost:11434')
  }

  async ok(): Promise<boolean> {
    try {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), 5000)
      
      const endpoint = this.isSircodeServer ? '/health' : '/api/tags'
      const res = await fetch(`${this.url}${endpoint}`, { signal: ctrl.signal })
      
      clearTimeout(timeout)
      return res.ok
    } catch (e) {
      return false
    }
  }

  async ls(): Promise<string[]> {
    try {
      if (this.isSircodeServer) {
        // Sircode Server /models endpoint
        const d = (await (await fetch(`${this.url}/models`)).json()) as { models?: string[] }
        return d.models ?? []
      } else {
        // Ollama /api/tags endpoint
        const d = (await (await fetch(`${this.url}/api/tags`)).json()) as { models?: Array<{ name: string }> }
        return (d.models ?? []).map(m => m.name)
      }
    } catch {
      return []
    }
  }

  async chat(msgs: Msg[], opts?: Opts): Promise<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 600000) // 10 min timeout for CPU models
    
    try {
      const endpoint = this.isSircodeServer ? '/chat' : '/api/chat'
      const body = {
        model: this.model,
        messages: msgs,
        stream: false,
        ...(this.isSircodeServer ? {} : { keep_alive: '10m' }),
      }

      const r = await fetch(`${this.url}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)
      
      if (!r.ok) throw new Error(`${this.isSircodeServer ? 'Sircode Server' : 'Ollama'}: ${r.status}`)
      const data = await r.json()
      
      // Handle both response formats
      const content = this.isSircodeServer ? data.content : data.message?.content
      if (!content) throw new Error('No response from model')
      return content
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
      const endpoint = this.isSircodeServer ? '/chat' : '/api/chat'
      const body = {
        model: this.model,
        messages: msgs,
        stream: true,
        ...(this.isSircodeServer ? {} : { keep_alive: '10m' }),
      }

      const r = await fetch(`${this.url}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)
      
      if (!r.ok) throw new Error(`${this.isSircodeServer ? 'Sircode Server' : 'Ollama'}: ${r.status}`)
      const reader = r.body?.getReader()
      if (!reader) return
      
      const dec = new TextDecoder()
      let buf = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buf += dec.decode(value, { stream: true })
        
        if (this.isSircodeServer) {
          // Sircode Server uses SSE format: data: {JSON}
          const lines = buf.split('\n')
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i]
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6))
                if (d.content) yield d.content
                if (d.error) throw new Error(d.error)
              } catch (e) {
                if (e instanceof Error && e.message.startsWith('{')) {
                  // Ignore JSON parse errors for incomplete messages
                } else if (e instanceof Error) {
                  throw e
                }
              }
            }
          }
          buf = lines[lines.length - 1]
        } else {
          // Ollama uses newline-delimited JSON
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
      const endpoint = this.isSircodeServer ? '/models/pull' : '/api/pull'
      const body = this.isSircodeServer ? { model } : { name: model, stream: false }

      const r = await fetch(`${this.url}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!r.ok) {
        throw new Error(`Failed to pull model ${model}: ${r.status} ${r.statusText}`)
      }

      if (this.isSircodeServer) {
        // Sircode Server streams pull progress as SSE
        const reader = r.body?.getReader()
        if (!reader) return
        const dec = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = dec.decode(value, { stream: true })
          // Just consume the stream, don't need to process it
        }
      } else {
        // Ollama returns JSON response
        await r.json()
      }
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
