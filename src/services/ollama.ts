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
    this.isSircodeServer = Boolean(urlObj.port) && urlObj.port !== '11434'
  }

  private chatEndpoints(): [primary: string, fallback: string] {
    return this.isSircodeServer ? ['/chat', '/api/chat'] : ['/api/chat', '/chat']
  }

  private pullEndpoints(): [primary: string, fallback: string] {
    return this.isSircodeServer ? ['/models/pull', '/api/pull'] : ['/api/pull', '/models/pull']
  }

  private buildPrompt(msgs: Msg[]): string {
    // Basic chat-to-prompt adapter for older Ollama versions that lack /api/chat.
    // Keeps formatting simple and deterministic.
    const parts: string[] = []
    for (const m of msgs) {
      if (!m?.content) continue
      if (m.role === 'system') parts.push(`System: ${m.content}`)
      else if (m.role === 'user') parts.push(`User: ${m.content}`)
      else parts.push(`Assistant: ${m.content}`)
    }
    parts.push('Assistant:')
    return parts.join('\n\n')
  }

  private async tryPostJson(
    endpoint: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    return await fetch(`${this.url}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  }

  async ok(): Promise<boolean> {
    try {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), 5000)
      
      const endpoints = this.isSircodeServer ? ['/health', '/api/tags'] : ['/api/tags', '/health']
      let res: Response | undefined
      let okEndpoint: string | undefined
      for (const endpoint of endpoints) {
        try {
          res = await fetch(`${this.url}${endpoint}`, { signal: ctrl.signal })
          if (res.ok) {
            okEndpoint = endpoint
            break
          }
        } catch {
          // try next
        }
      }
      
      clearTimeout(timeout)
      if (!res) return false
      if (res.ok && okEndpoint === '/health') this.isSircodeServer = true
      if (res.ok && okEndpoint === '/api/tags') this.isSircodeServer = false
      return res.ok
    } catch (e) {
      return false
    }
  }

  async ls(): Promise<string[]> {
    try {
      // Prefer whichever API matches the server, but fall back gracefully.
      const endpoints = this.isSircodeServer ? ['/models', '/api/tags'] : ['/api/tags', '/models']

      // Sircode Server /models endpoint
      if (endpoints[0] === '/models') {
        const r = await fetch(`${this.url}/models`)
        if (r.ok) {
          this.isSircodeServer = true
          const d = (await r.json()) as { models?: string[] }
          return d.models ?? []
        }
      }

      // Ollama /api/tags endpoint
      const r = await fetch(`${this.url}/api/tags`)
      if (r.ok) {
        this.isSircodeServer = false
        const d = (await r.json()) as { models?: Array<{ name: string }> }
        return (d.models ?? []).map(m => m.name)
      }

      // Last attempt: the endpoint we didn't try first (in case first failed non-404)
      if (endpoints[0] === '/api/tags') {
        const r2 = await fetch(`${this.url}/models`)
        if (r2.ok) {
          this.isSircodeServer = true
          const d = (await r2.json()) as { models?: string[] }
          return d.models ?? []
        }
      } else {
        const r2 = await fetch(`${this.url}/api/tags`)
        if (r2.ok) {
          this.isSircodeServer = false
          const d = (await r2.json()) as { models?: Array<{ name: string }> }
          return (d.models ?? []).map(m => m.name)
        }
      }

      return []
    } catch {
      return []
    }
  }

  async chat(msgs: Msg[], opts?: Opts): Promise<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 600000) // 10 min timeout for CPU models
    
    try {
      const body = {
        model: this.model,
        messages: msgs,
        stream: false,
        ...(this.isSircodeServer ? {} : { keep_alive: '10m' }),
      }

      const [primary, fallback] = this.chatEndpoints()
      let r = await this.tryPostJson(primary, body, ctrl.signal)
      if (r.status === 404 || r.status === 405) {
        r = await this.tryPostJson(fallback, body, ctrl.signal)
        if (r.ok) this.isSircodeServer = fallback === '/chat'
      }

      // Older Ollama versions may not support /api/chat. Fall back to /api/generate.
      if (!this.isSircodeServer && r.status === 404) {
        const gen = {
          model: this.model,
          prompt: this.buildPrompt(msgs),
          stream: false,
          keep_alive: '10m',
          options: opts,
        }
        r = await this.tryPostJson('/api/generate', gen, ctrl.signal)
      }
      clearTimeout(timeout)
      
      if (!r.ok) {
        throw new Error(
          `${this.isSircodeServer ? 'Sircode Server' : 'Ollama'}: ${r.status} (${r.url})`,
        )
      }
      const data = await r.json()
      
      // Handle both response formats
      const content = this.isSircodeServer ? data.content : (data.message?.content ?? data.response)
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
      const body = {
        model: this.model,
        messages: msgs,
        stream: true,
        ...(this.isSircodeServer ? {} : { keep_alive: '10m' }),
      }

      const [primary, fallback] = this.chatEndpoints()
      let r = await this.tryPostJson(primary, body, ctrl.signal)
      if (r.status === 404 || r.status === 405) {
        r = await this.tryPostJson(fallback, body, ctrl.signal)
        if (r.ok) this.isSircodeServer = fallback === '/chat'
      }

      // Older Ollama: if /api/chat doesn't exist, stream from /api/generate instead.
      let isGenerateStream = false
      if (!this.isSircodeServer && r.status === 404) {
        const gen = {
          model: this.model,
          prompt: this.buildPrompt(msgs),
          stream: true,
          keep_alive: '10m',
          options: opts,
        }
        r = await this.tryPostJson('/api/generate', gen, ctrl.signal)
        isGenerateStream = true
      }
      clearTimeout(timeout)
      
      if (!r.ok) {
        throw new Error(
          `${this.isSircodeServer ? 'Sircode Server' : 'Ollama'}: ${r.status} (${r.url})`,
        )
      }
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
          // Ollama uses newline-delimited JSON (both /api/chat and /api/generate)
          const lines = buf.split('\n')
          for (let i = 0; i < lines.length - 1; i++) {
            try {
              const d = JSON.parse(lines[i]!) as OllamaRes & { response?: string }
              if (!isGenerateStream) {
                if (d.message?.content) yield d.message.content
              } else {
                if (d.response) yield d.response
              }
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
    // Back-compat alias used by some callers: route to the robust implementation.
    yield* this.streamChat(msgs, opts)
  }

  /**
   * Pull a model from registry (automatic download)
   */
  async pull(model: string): Promise<void> {
    try {
      const [primary, fallback] = this.pullEndpoints()
      const bodyPrimary = primary === '/models/pull' ? { model } : { name: model, stream: false }
      const bodyFallback = fallback === '/models/pull' ? { model } : { name: model, stream: false }

      let r = await this.tryPostJson(primary, bodyPrimary)
      if (r.status === 404 || r.status === 405) {
        r = await this.tryPostJson(fallback, bodyFallback)
        if (r.ok) this.isSircodeServer = fallback === '/models/pull'
      }

      if (!r.ok) {
        throw new Error(`Failed to pull model ${model}: ${r.status} ${r.statusText} (${r.url})`)
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
      const [primary, fallback] = this.pullEndpoints()
      const bodyPrimary = primary === '/models/pull' ? { model } : { name: model, stream: true }
      const bodyFallback = fallback === '/models/pull' ? { model } : { name: model, stream: true }

      let r = await this.tryPostJson(primary, bodyPrimary)
      if (r.status === 404) {
        r = await this.tryPostJson(fallback, bodyFallback)
        if (r.ok) this.isSircodeServer = fallback === '/models/pull'
      }

      if (!r.ok) {
        throw new Error(`Failed to pull model ${model}: ${r.status} (${r.url})`)
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
