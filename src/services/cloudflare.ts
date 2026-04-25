import type { Msg, Opts } from '../types/index.js'

export interface CloudflareAIConfig {
  accountId: string
  apiToken: string
  model?: string
}

/**
 * Cloudflare Workers AI client
 * Supports @cf models (Workers AI)
 */
export class CloudflareAI {
  private accountId: string
  private apiToken: string
  model: string

  constructor(config: CloudflareAIConfig) {
    this.accountId = config.accountId
    this.apiToken = config.apiToken
    this.model = config.model || '@cf/meta/llama-3.1-8b-instruct'
  }

  private get baseUrl(): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`
  }

  async ok(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      })
      return r.ok
    } catch {
      return false
    }
  }

  async ls(): Promise<string[]> {
    // Cloudflare doesn't have a list endpoint like Ollama
    // Return common models
    return [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-70b-instruct',
      '@cf/meta/llama-3.2-11b-vision-instruct',
      '@cf/meta/llama-3.2-90b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-awq',
      '@cf/meta/llama-3.2-1b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/mistral/mistral-7b-instruct-v0.2',
      '@cf/google/gemma-2-9b-it',
      '@cf/google/gemma-2-27b-it',
      '@cf/deepseek-ai/deepseek-r1',
      '@cf/qwen/qwen2.5-72b-instruct',
      '@cf/thebloke/codestral-22b-awq',
      '@cf/tinybird/small-chat',
    ]
  }

  async chat(msgs: Msg[], opts?: Opts): Promise<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 300000) // 5 min timeout

    try {
      const r = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: msgs,
          stream: false,
          ...this.buildOptions(opts),
        }),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)

      if (!r.ok) throw new Error(`Cloudflare AI: ${r.status}`)
      const data = await r.json() as CloudflareResponse
      if (!data.result?.response) throw new Error('No response from model')
      return data.result.response
    } catch (e) {
      clearTimeout(timeout)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Request timeout (5min)')
      }
      throw e
    }
  }

  async *streamChat(msgs: Msg[], opts?: Opts): AsyncGenerator<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 300000) // 5 min timeout

    try {
      const r = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: msgs,
          stream: true,
          ...this.buildOptions(opts),
        }),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)

      if (!r.ok) throw new Error(`Cloudflare AI: ${r.status}`)
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
          const line = lines[i]!
          if (!line.trim() || !line.startsWith('data:')) continue
          try {
            const data = JSON.parse(line.slice(5)) as CloudflareStreamResponse
            if (data.result?.response) yield data.result.response
          } catch {}
        }
        buf = lines[lines.length - 1]!
      }
    } catch (e) {
      clearTimeout(timeout)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Stream timeout (5min)')
      }
      throw e
    }
  }

  async *stream(msgs: Msg[], opts?: Opts): AsyncGenerator<string> {
    yield* this.streamChat(msgs, opts)
  }

  private buildOptions(opts?: Opts): Record<string, unknown> {
    const options: Record<string, unknown> = {}
    if (opts?.temperature) options.temperature = opts.temperature
    if (opts?.max_tokens) options.max_tokens = opts.max_tokens
    if (opts?.top_p) options.top_p = opts.top_p
    return options
  }

  set(m: string): void {
    this.model = m
  }

  get(): string {
    return this.model
  }
}

interface CloudflareResponse {
  result?: {
    response: string
  }
}

interface CloudflareStreamResponse {
  result?: {
    response: string
  }
}