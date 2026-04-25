import type { Msg, Opts } from '../types/index.js'

export interface OpenAIGatewayConfig {
  accountId: string
  apiToken: string
  gatewayId?: string
  model?: string
}

/**
 * OpenAI-compatible client using Cloudflare AI Gateway
 * Supports OpenAI models via Cloudflare Workers AI
 */
export class OpenAIGateway {
  private accountId: string
  private apiToken: string
  private gatewayId: string
  model: string

  constructor(config: OpenAIGatewayConfig) {
    this.accountId = config.accountId
    this.apiToken = config.apiToken
    this.gatewayId = config.gatewayId || 'default'
    this.model = config.model || 'openai/gpt-5.4-nano'
  }

  private get baseUrl(): string {
    return `https://gateway.ai.cloudflare.com/v1/${this.accountId}/${this.gatewayId}`
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
    return [
      'openai/gpt-5.4-nano',
      'openai/gpt-4o-mini',
      'openai/gpt-4o',
      'openai/o1-mini',
      'openai/o1-preview',
    ]
  }

  async chat(msgs: Msg[], opts?: Partial<Opts> & Record<string, any>): Promise<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 300000)

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

      if (!r.ok) throw new Error(`OpenAI Gateway: ${r.status}`)
      const data = await r.json() as OpenAIResponse
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('No response from model')
      }
      return data.choices[0].message.content
    } catch (e) {
      clearTimeout(timeout)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Request timeout (5min)')
      }
      throw e
    }
  }

  async *streamChat(msgs: Msg[], opts?: Partial<Opts> & Record<string, any>): AsyncGenerator<string> {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 300000)

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
          stream_options: { include_usage: true },
          ...this.buildOptions(opts),
        }),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)

      if (!r.ok) throw new Error(`OpenAI Gateway: ${r.status}`)
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
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line) as OpenAIStreamResponse
            const content = data.choices?.[0]?.delta?.content
            if (content) yield content
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

  async *stream(msgs: Msg[], opts?: Partial<Opts> & Record<string, any>): AsyncGenerator<string> {
    yield* this.streamChat(msgs, opts)
  }

  private buildOptions(opts?: Partial<Opts> & Record<string, any>): Record<string, unknown> {
    const options: Record<string, unknown> = {}
    if (opts?.temperature !== undefined) options.temperature = opts.temperature
    if (opts?.max_tokens !== undefined) options.max_tokens = opts.max_tokens
    if (opts?.top_p !== undefined) options.top_p = opts.top_p
    return options
  }

  set(m: string): void {
    this.model = m
  }

  get(): string {
    return this.model
  }
}

interface OpenAIResponse {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index?: number
    message?: {
      role?: string
      content?: string
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

interface OpenAIStreamResponse {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index?: number
    delta?: {
      content?: string
      role?: string
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}
