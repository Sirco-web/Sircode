/**
 * Ollama Auto-Setup
 * Auto-downloads and starts Ollama if not already running
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as https from 'https'
import * as http from 'http'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export class OllamaSetup {
  private static readonly OLLAMA_HOME = path.join(os.homedir(), '.ollama')
  private static readonly OLLAMA_BIN_DIR = path.join(os.homedir(), '.ollama', 'bin')
  private static readonly OLLAMA_REPOS_DIR = path.join(os.homedir(), '.ollama', 'models', 'blobs', 'downloads')
  private static readonly OLLAMA_PORT = 11434

  /**
   * Check if Ollama is installed
   */
  static isInstalled(): boolean {
    try {
      const ollamaPath = this.getOllamaPath()
      return fs.existsSync(ollamaPath)
    } catch {
      return false
    }
  }

  /**
   * Get the Ollama executable path
   */
  private static getOllamaPath(): string {
    const platform = os.platform()
    const arch = os.arch()

    if (platform === 'darwin') {
      // macOS - check both arm64 and x64
      return '/usr/local/bin/ollama'
    } else if (platform === 'linux') {
      return '/usr/local/bin/ollama'
    } else if (platform === 'win32') {
      return path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Ollama', 'ollama.exe')
    }

    throw new Error(`Unsupported platform: ${platform}`)
  }

  /**
   * Check if Ollama is running
   */
  static async isRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${this.OLLAMA_PORT}/api/tags`, (res) => {
        resolve(res.statusCode === 200)
      })

      req.on('error', () => resolve(false))
      req.setTimeout(2000, () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  /**
   * Download and install Ollama
   */
  static async install(): Promise<void> {
    const platform = os.platform()
    const arch = os.arch()

    console.log(`📥 Downloading Ollama for ${platform}-${arch}...`)

    // Ensure directories exist
    if (!fs.existsSync(this.OLLAMA_HOME)) {
      fs.mkdirSync(this.OLLAMA_HOME, { recursive: true })
    }
    if (!fs.existsSync(this.OLLAMA_BIN_DIR)) {
      fs.mkdirSync(this.OLLAMA_BIN_DIR, { recursive: true })
    }

    if (platform === 'linux') {
      // Linux - try curl first, then use package manager
      try {
        const { stdout, stderr } = await execPromise(
          'curl -fsSL https://ollama.ai/install.sh | sh',
          { shell: '/bin/bash' }
        )
        console.log('✅ Ollama installed via package manager')
      } catch (e) {
        console.error('Failed to install Ollama:', e instanceof Error ? e.message : String(e))
        throw new Error('Failed to install Ollama. Make sure you have curl installed or install Ollama manually.')
      }
    } else if (platform === 'darwin') {
      // macOS - download binary
      try {
        const arch = os.arch() === 'arm64' ? 'arm64' : 'x86_64'
        const url = `https://ollama.ai/download/ollama-darwin-${arch}`
        await this.downloadFile(url, '/usr/local/bin/ollama')
        await execPromise('chmod +x /usr/local/bin/ollama')
        console.log('✅ Ollama installed on macOS')
      } catch (e) {
        console.error('Failed to install Ollama on macOS:', e instanceof Error ? e.message : String(e))
        throw new Error('Failed to install Ollama. Try installing manually from https://ollama.ai')
      }
    } else if (platform === 'win32') {
      // Windows - guide user to download installer
      throw new Error(
        `Please download Ollama from https://ollama.ai\n` +
          `Windows requires the installer. After installing, restart this command.`
      )
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Start Ollama service
   */
  static async start(): Promise<void> {
    const platform = os.platform()

    console.log('🚀 Starting Ollama...')

    try {
      if (platform === 'linux' || platform === 'darwin') {
        // Unix-like: start ollama serve in background
        const proc = exec('ollama serve')
        proc.unref() // Allow process to run in background
      } else if (platform === 'win32') {
        // Windows: spawn detached process
        const proc = exec('ollama serve')
        proc.unref()
      }

      // Wait for Ollama to be ready (max 30 seconds)
      const startTime = Date.now()
      const maxWait = 30000
      let ready = false

      while (Date.now() - startTime < maxWait && !ready) {
        ready = await this.isRunning()
        if (!ready) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      if (!ready) {
        throw new Error('Ollama did not start within 30 seconds')
      }

      console.log('✅ Ollama is ready')
    } catch (e) {
      throw new Error(`Failed to start Ollama: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  /**
   * Setup Ollama (install if needed, start if not running)
   */
  static async setup(): Promise<void> {
    // Check if installed
    if (!this.isInstalled()) {
      await this.install()
    }

    // Check if running
    const running = await this.isRunning()
    if (!running) {
      await this.start()
    } else {
      console.log('✅ Ollama is already running')
    }
  }

  /**
   * Download file from URL
   */
  private static downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest)
      const protocol = url.startsWith('https') ? https : http

      const request = protocol.get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Follow redirect
          this.downloadFile(response.headers.location, dest).then(resolve).catch(reject)
          return
        }

        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
        file.on('error', (err: Error) => {
          fs.unlink(dest, () => {})
          reject(err)
        })
      })

      request.on('error', (err: Error) => {
        fs.unlink(dest, () => {})
        reject(err)
      })
    })
  }
}
