/**
 * Sircode Server
 * Distributed Ollama backend for remote clients
 * Runs on the GPU machine, accepts requests from CLI clients on network
 */

import express from 'express'
import * as http from 'http'
import * as os from 'os'
import chalk from 'chalk'
import { Ollama } from './ollama.js'
import { GPUDetector } from './gpuDetector.js'
import { OllamaSetup } from './ollamaSetup.js'

export interface ServerConfig {
  port: number
  host: string // 0.0.0.0 for network access
  verbose: boolean
  ollamaUrl: string // Where Ollama runs locally
}

export interface ChatRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
}

export interface ChatResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

export class SircodeServer {
  private app: express.Application
  private server: http.Server | null = null
  private config: ServerConfig
  private ollama: Ollama | null = null
  private isRunning = false

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 8093,
      host: '0.0.0.0', // Listen on all interfaces
      verbose: false,
      ollamaUrl: 'http://localhost:11434',
      ...config,
    }

    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '50mb' }))
    this.app.use((req, res, next) => {
      if (this.config.verbose) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
      }
      next()
    })
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    /**
     * Health check
     */
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        gpu: GPUDetector.detect(),
        uptime: process.uptime(),
      })
    })

    /**
     * Chat completion
     */
    this.app.post('/chat', async (req, res) => {
      try {
        const { model, messages, stream } = req.body as ChatRequest

        if (!model) {
          res.status(400).json({ error: 'Model required' })
          return
        }

        if (!this.ollama) {
          res.status(500).json({ error: 'Ollama not initialized' })
          return
        }

        // Ensure model is available
        await this.ensureModel(model)

        // Cast messages to proper type
        const msgs = messages as Array<{ role: string; content: string }>

        if (stream) {
          // Streaming response
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')

          try {
            for await (const chunk of this.ollama.streamChat(msgs.map((m) => ({ ...m, role: m.role as 'user' | 'assistant' | 'system' })))) {
              res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            }
            res.write(`data: [DONE]\n\n`)
            res.end()
          } catch (e) {
            res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : String(e) })}\n\n`)
            res.end()
          }
        } else {
          // Single response
          const response = await this.ollama.chat(
            msgs.map((m) => ({ ...m, role: m.role as 'user' | 'assistant' | 'system' }))
          )
          res.json({
            content: response,
            model,
          } as ChatResponse)
        }
      } catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
      }
    })

    /**
     * List available models
     */
    this.app.get('/models', async (req, res) => {
      try {
        if (!this.ollama) {
          res.status(500).json({ error: 'Ollama not initialized' })
          return
        }

        const models = await this.ollama.ls()
        res.json({ models })
      } catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
      }
    })

    /**
     * Pull a model
     */
    this.app.post('/models/pull', async (req, res) => {
      try {
        const { model } = req.body

        if (!model) {
          res.status(400).json({ error: 'Model name required' })
          return
        }

        if (!this.ollama) {
          res.status(500).json({ error: 'Ollama not initialized' })
          return
        }

        // Stream pull progress as SSE
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        try {
          res.write(`data: ${JSON.stringify({ status: 'pulling', model })}\n\n`)

          // Pull the model
          await this.ollama.pull(model)

          res.write(`data: ${JSON.stringify({ status: 'complete', model })}\n\n`)
          res.end()
        } catch (e) {
          res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : String(e) })}\n\n`)
          res.end()
        }
      } catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
      }
    })

    /**
     * Server info
     */
    this.app.get('/info', (req, res) => {
      res.json({
        name: 'Sircode Server',
        version: '0.1.0',
        platform: os.platform(),
        arch: os.arch(),
        memory: os.totalmem(),
        hostname: os.hostname(),
        gpu: GPUDetector.detect(),
        uptime: process.uptime(),
      })
    })

    /**
     * Ensure model is available (check and pull if needed)
     */
    this.app.post('/models/ensure', async (req, res) => {
      try {
        const { model } = req.body

        if (!model) {
          res.status(400).json({ error: 'Model name required' })
          return
        }

        if (!this.ollama) {
          res.status(500).json({ error: 'Ollama not initialized' })
          return
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        try {
          // Check if model exists
          const models = await this.ollama.ls()
          if (models.includes(model)) {
            res.write(`data: ${JSON.stringify({ status: 'exists', model })}\n\n`)
            res.end()
            return
          }

          // Model not found, pull it
          res.write(`data: ${JSON.stringify({ status: 'pulling', model })}\n\n`)
          await this.ollama.pull(model)
          res.write(`data: ${JSON.stringify({ status: 'complete', model })}\n\n`)
          res.end()
        } catch (e) {
          res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : String(e) })}\n\n`)
          res.end()
        }
      } catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  /**
   * Ensure model is available, pull if needed
   */
  private async ensureModel(model: string): Promise<void> {
    if (!this.ollama) return

    try {
      const availableModels = await this.ollama.ls()

      // Check if model is already available
      if (availableModels.includes(model)) {
        return
      }

      if (this.config.verbose) {
        console.log(`Pulling model: ${model}`)
      }

      // Pull the model
      await this.ollama.pull(model)

      if (this.config.verbose) {
        console.log(`Model pulled: ${model}`)
      }
    } catch (e) {
      console.error(`Failed to pull model ${model}:`, e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Auto-setup Ollama if needed
      console.log('🔧 Setting up Ollama...')
      await OllamaSetup.setup()

      // Set GPU environment
      const gpuEnv = GPUDetector.getOllamaEnv()
      Object.assign(process.env, gpuEnv)

      if (this.config.verbose) {
        const gpu = GPUDetector.detect()
        console.log(`GPU Detection: ${GPUDetector.format(gpu)}`)
      }

      // Initialize Ollama
      this.ollama = new Ollama('mistral', this.config.ollamaUrl)

      // Test connection
      if (!(await this.testOllama())) {
        throw new Error('Cannot connect to Ollama. Make sure Ollama is running.')
      }

      // Start Express server
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        this.isRunning = true
        console.log(`✅ Sircode Server running on http://${this.config.host}:${this.config.port}`)
        console.log(`🌐 Network access: http://${this.getLocalIP()}:${this.config.port}`)
        console.log(`🧠 GPU: ${GPUDetector.format()}`)
      })
    } catch (e) {
      console.error('Failed to start server:', e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.isRunning = false
      console.log('Server stopped.')
    }
  }

  /**
   * Test Ollama connection
   */
  private async testOllama(): Promise<boolean> {
    try {
      if (!this.ollama) return false
      const models = await this.ollama.ls()
      return Array.isArray(models)
    } catch (e) {
      return false
    }
  }

  /**
   * Get local IP address for network access
   */
  private getLocalIP(): string {
    const interfaces = os.networkInterfaces()

    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name]
      if (!ifaces) continue

      for (const iface of ifaces) {
        // Skip internal and non-IPv4
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }

    return 'localhost'
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get server address
   */
  getAddress(): string {
    return `http://${this.getLocalIP()}:${this.config.port}`
  }
}
