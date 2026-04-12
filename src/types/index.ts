export interface Msg {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface Ctx {
  msgs: Msg[]
  sys: string
  model: string
}

export interface ToolRes {
  ok: boolean
  out: string
  err?: string
  ms: number
}

export interface OllamaRes {
  model: string
  message: Msg
  done: boolean
}

export interface Opts {
  temp?: number
  top_k?: number
  top_p?: number
  predict?: number
  stop?: string[]
}
