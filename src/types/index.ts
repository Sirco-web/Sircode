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
  /** Max new tokens; use -1 for no cap (Ollama `num_predict`) */
  predict?: number
  /** Context window size (Ollama `num_ctx`); high default in buildOllamaGenOptions */
  num_ctx?: number
  stop?: string[]
}
