import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import chalk from 'chalk'

const ex = promisify(exec)

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function ensureOllama(url: string, maxRetries: number = 15): Promise<boolean> {
  let started = false
  
  // Try to fetch from Ollama
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) })
      if (response.ok) {
        if (started) {
          console.log(chalk.green('✓ Ollama started successfully'))
        }
        return true
      }
    } catch {
      // Ollama not running yet
    }

    if (i === 0) {
      // First attempt failed, try to start Ollama
      try {
        process.stdout.write(chalk.yellow('Starting Ollama... '))
        const proc = spawn('ollama', ['serve'], { 
          detached: true, 
          stdio: 'ignore'
        })
        proc.unref() // Allow parent to exit
        started = true
        console.log('(waiting for startup)')
      } catch (e) {
        // ollama command not found or failed
        console.log(chalk.yellow('[Ollama not found]'))
        started = false
      }
    } else if (started) {
      // Show progress while waiting
      process.stdout.write(chalk.dim('.'))
    }

    // Wait before retrying
    await sleep(500)
  }

  return false
}
