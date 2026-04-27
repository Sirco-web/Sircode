#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import * as readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from 'fs'
import { dirname, resolve } from 'path'
import { Ollama } from './services/ollama.js'
import { CloudflareAI } from './services/cloudflare.js'
import { OpenAIGateway } from './services/openaiGateway.js'
import { ContextService } from './services/context.js'
import { SessionCoordinator } from './coordinator/session.js'
import { run as runTool } from './tools/index.js'
import { fmt, parse } from './utils/index.js'
import { ensureOllama } from './services/startup.js'
import { ToolStreamExecutor } from './services/toolStream.js'
import { FrustrationDetector } from './services/frustration.js'
import { UncoverMode } from './services/undercover.js'
import { MemorySystem } from './services/memory.js'
import { Agent } from './services/agent.js'
import { SmallModelCorrectorSystem } from './services/smallModelCorrector.js'
import { SircodeServer } from './services/server.js'
import { GPUDetector } from './services/gpuDetector.js'

const ex = promisify(exec)

const p = new Command()
  .name('sircode')
  .description('Autonomous CLI coding assistant')
  .version('0.1.0')

const runChat = async (model: string | undefined, opts: { url: string; smallModelMode?: boolean; server?: string; cloudflare?: string; openai?: string }): Promise<void> => {
    const savedSettings = mergeSettings(loadSettings())
    const activeProvider: SircodeSettings['provider'] = opts.cloudflare
      ? 'cloudflare'
      : opts.openai
        ? 'openai'
        : opts.server
          ? 'ollama'
          : savedSettings.provider

    const activeModel =
      model ||
      (activeProvider === 'cloudflare' ? savedSettings.model || '@cf/meta/llama-3.1-8b-instruct'
        : activeProvider === 'openai' ? savedSettings.model || 'openai/gpt-5.4-nano'
        : savedSettings.model || 'mistral')

    console.log(fmt.hdr(`Sircode: ${activeModel}`))

    // Determine which AI backend to use
    let ai: Ollama | CloudflareAI | OpenAIGateway
    let useStreaming = true

    const startInteractiveCloudChat = async (
      backend: CloudflareAI | OpenAIGateway,
      label: string,
    ): Promise<void> => {
      console.log()

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

      rl.on('close', () => {
        console.log(chalk.dim(`\nSession closed for ${label}`))
      })

      const ask = (): void => {
        rl.question(chalk.blue('You: '), async (inp: string) => {
          if (inp.toLowerCase() === 'exit') {
            console.log(chalk.cyan('bye'))
            rl.close()
            return
          }

          if (inp.toLowerCase() === 'models') {
            console.log(chalk.cyan((await backend.ls()).join(', ')))
            ask()
            return
          }

          if (!inp.trim()) {
            ask()
            return
          }

          console.log(chalk.dim('streaming...\n'))

          try {
            let res = ''
            for await (const chunk of backend.streamChat([
              { role: 'system', content: 'You are Sircode, a concise coding assistant.' },
              { role: 'user', content: inp },
            ])) {
              process.stdout.write(chalk.green(chunk))
              res += chunk
            }
            console.log('\n')

            if (!res.trim()) {
              console.log(chalk.yellow('No response returned.'))
            }
          } catch (e) {
            console.error(chalk.red(`\n✗ ${e instanceof Error ? e.message : String(e)}`))
          }

          ask()
        })
      }

      ask()
    }

    if (activeProvider === 'cloudflare') {
      // Cloudflare Workers AI mode
      const cfModel = opts.cloudflare || activeModel
      console.log(chalk.cyan('☁️  Using Cloudflare Workers AI'))
      ai = new CloudflareAI({
        accountId: savedSettings.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID || '',
        apiToken: savedSettings.cloudflareApiToken || process.env.CLOUDFLARE_API_TOKEN || '',
        model: cfModel || '@cf/meta/llama-3.1-8b-instruct',
      })
      if (!(await (ai as CloudflareAI).ok())) {
        console.error(chalk.red('✗ Cloudflare AI not configured'))
        console.error(chalk.red('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars'))
        process.exit(1)
      }
      console.log(chalk.green(`✓ Connected to Cloudflare AI`))
      console.log(chalk.dim(`Model: ${(ai as CloudflareAI).model}`))
      await startInteractiveCloudChat(ai as CloudflareAI, 'Cloudflare Workers AI')
      return
    } else if (activeProvider === 'openai') {
      // OpenAI via Cloudflare Gateway mode
      const openaiModel = opts.openai || activeModel
      console.log(chalk.cyan('🔗 Using OpenAI via Cloudflare Gateway'))
      
      const accountId = savedSettings.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID || ''
      const apiToken = savedSettings.cloudflareApiToken || process.env.CLOUDFLARE_API_TOKEN || ''
      
      if (!accountId || !apiToken) {
        console.error(chalk.red('✗ OpenAI Gateway not configured'))
        console.error(chalk.red(''))
        console.error(chalk.red('Set Cloudflare credentials using:'))
        console.error(chalk.red('  sircode settings set'))
        console.error(chalk.red(''))
        console.error(chalk.red('Or set environment variables:'))
        console.error(chalk.red('  export CLOUDFLARE_ACCOUNT_ID="your-account-id"'))
        console.error(chalk.red('  export CLOUDFLARE_API_TOKEN="your-api-token"'))
        process.exit(1)
      }
      
      ai = new OpenAIGateway({
        accountId,
        apiToken,
        model: openaiModel || 'openai/gpt-5.4-nano',
      })
      if (!(await (ai as OpenAIGateway).ok())) {
        console.error(chalk.red('✗ Failed to connect to OpenAI Gateway'))
        console.error(chalk.red('Check your Cloudflare Account ID and API Token'))
        process.exit(1)
      }
      console.log(chalk.green(`✓ Connected to OpenAI Gateway`))
      console.log(chalk.dim(`Model: ${(ai as OpenAIGateway).model}`))
      await startInteractiveCloudChat(ai as OpenAIGateway, 'OpenAI Gateway')
      return
    } else if (opts.server) {
      // Parse server address
      let serverUrl = opts.server
      if (!serverUrl.startsWith('http')) {
        // Add default port if not specified
        if (!serverUrl.includes(':')) {
          serverUrl = `http://${serverUrl}:8093`
        } else if (serverUrl.match(/:\d+$/) === null) {
          serverUrl = `http://${serverUrl}:8093`
        } else {
          serverUrl = `http://${serverUrl}`
        }
      }

      console.log(chalk.cyan(`🌐 Connecting to server: ${serverUrl}`))

      // Use remote Ollama via server
      const o = new Ollama(activeModel, `${serverUrl}`)
      const coord = new SessionCoordinator(process.cwd(), activeModel)
      const frustration = new FrustrationDetector()

      // Test connection
      if (!(await o.ok())) {
        console.error(chalk.red(`✗ Can't reach Sircode server at ${serverUrl}`))
        process.exit(1)
      }

      console.log(chalk.green('✓ Connected'))
      console.log(chalk.dim(`Server: ${serverUrl}`))
      console.log()

      // Check if model exists, pull if needed
      console.log(chalk.dim('📦 Checking model availability...'))
      try {
        const checkRes = await fetch(`${serverUrl}/models/ensure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: activeModel }),
        })

        if (checkRes.ok && checkRes.body) {
          const reader = checkRes.body.getReader()
          const dec = new TextDecoder()
          let spinner = 0
          const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = dec.decode(value, { stream: true })
            const lines = text.split('\n').filter(l => l.length > 0)

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.status === 'exists') {
                    console.log(chalk.green(`✓ Model ${activeModel} ready`))
                  } else if (data.status === 'pulling') {
                    console.log(chalk.yellow(`📥 Downloading model ${activeModel}...`))
                  } else if (data.status === 'complete') {
                    console.log(chalk.green(`✓ Model ${activeModel} downloaded`))
                  } else if (data.error) {
                    console.error(chalk.yellow(`⚠️  ${data.error}`))
                  }
                } catch {}
              }
            }
          }
        }
      } catch (e) {
        console.warn(chalk.dim(`⚠️  Could not check model: ${e instanceof Error ? e.message : String(e)}`))
      }

      console.log()

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

      rl.on('close', () => {
        coord.close()
        console.log(chalk.dim(`\nSession saved to .code/`))
      })

      const ask = (): void => {
        rl.question(chalk.blue('You: '), async (inp: string) => {
          if (inp.toLowerCase() === 'exit') {
            console.log(chalk.cyan('bye'))
            rl.close()
            return
          }
          if (inp.toLowerCase() === 'models') {
            console.log(chalk.cyan((await o.ls()).join(', ')))
            ask()
            return
          }
          if (!inp.trim()) {
            ask()
            return
          }

          coord.recordMessage()
          console.log(chalk.dim('streaming...\n'))

          try {
            let res = ''
            for await (const chunk of o.streamChat([
              { 
                role: 'system', 
                content: `You are Sircode - an autonomous coding assistant.

CRITICAL: Tool Format Requirement ⚠️
Tools MUST use BRACKET FORMAT: [tool: args]
NOT markdown code blocks - those are IGNORED!

✅ CORRECT: [wf: file.html, <!DOCTYPE html>...]
❌ WRONG:  \`\`\`bash\\nwf: file.html, content\\n\`\`\`

Bracket Format = Files Created ✓
Markdown Code Blocks = Ignored ✗

Available tools: wf (write), fe (edit), fr (read), bash (execute), ws (search), wf2 (fetch)
Always use [tool: args] bracket format - never use markdown code blocks!`
              },
              { role: 'user', content: inp },
            ])) {
              process.stdout.write(chalk.green(chunk))
              res += chunk
            }
            console.log('\n')

            if (res) {
              coord.session.messages++
            }
          } catch (e) {
            console.error(chalk.red(`\n✗ ${e instanceof Error ? e.message : String(e)}`))
            coord.session.errors++
          }

          ask()
        })
      }

      ask()
      return
    } else {
    // Initialize Ollama for local mode
      const o = new Ollama(activeModel, activeProvider === 'ollama' ? savedSettings.url || opts.url : opts.url)
      const c = new ContextService(activeModel)
      const coord = new SessionCoordinator(process.cwd(), activeModel)
    const frustration = new FrustrationDetector()
    const undercover = new UncoverMode()
    const memory = new MemorySystem()

    console.log(chalk.dim('Checking Ollama...'))
    const ok = await ensureOllama(opts.url)
    
    if (!ok) {
      console.error(chalk.red(`✗ Can't reach Ollama at ${opts.url}`))
      console.error(chalk.red('Make sure Ollama is installed: https://ollama.ai'))
      process.exit(1)
    }

    console.log(chalk.green('✓ OK'))
    console.log(chalk.dim(`Tools: ${(await import('./tools/index.js')).ls().map(t => t.name).join(', ')}`))
    console.log(chalk.dim(`Session: ${coord.session.id}`))
    console.log()

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    rl.on('close', () => {
      coord.close()
      console.log(chalk.dim(`\nSession saved to .code/`))
    })

    // Initialize SmallModelCorrector if flag is set
      const corrector = opts.smallModelMode
      ? new SmallModelCorrectorSystem(o, {
          maxIterations: 3,
          temperature: 0.3,
          useMultiResponse: true,
          strictMode: true,
          verbose: true,
          useRAG: false,
        })
      : null
    
    if (opts.smallModelMode) {
      console.log(chalk.yellow('✓ Small model mode enabled'))
      console.log(chalk.dim('  • Task classification enabled'))
      console.log(chalk.dim('  • Prompt rewriting enabled'))
      console.log(chalk.dim('  • Multi-response validation enabled'))
      console.log()
    }

    const ask = (): void => {
      rl.question(chalk.blue('You: '), async (inp: string) => {
        if (inp.toLowerCase() === 'exit') { console.log(chalk.cyan('bye')); rl.close(); return }
        if (inp.toLowerCase() === 'models') { console.log(chalk.cyan((await o.ls()).join(', '))); ask(); return }
        if (inp.toLowerCase() === 'clear') { c.clear(); console.log(chalk.yellow('cleared')); ask(); return }
        if (inp.toLowerCase() === 'stats') { console.log(chalk.cyan(JSON.stringify(coord.getStats(), null, 2))); ask(); return }
        if (!inp.trim()) { ask(); return }

        // 🔍 Frustration Detection
        const frustAnalysis = frustration.analyze(inp)
        if (frustAnalysis.isFrustrated) {
          const severity = frustration.getSeverity(frustAnalysis)
          console.log(chalk.yellow(`  ${frustration.formatForLog(frustAnalysis)}`))
          coord.session.negativeCount = (coord.session.negativeCount || 0) + 1
        }

        coord.recordMessage()
        c.add('user', inp)
        
        // Check for auto-compaction
        coord.recordContextSnapshot(c.get())
        
        console.log(chalk.dim('streaming...\n'))
        
        try {
          let res = ''
          
          // Use SmallModelCorrector if flag is set
          if (corrector && opts.smallModelMode) {
            console.log(chalk.dim('  [Small model corrector]'))
            // Build selective context (only recent + important facts)
            const selectiveCtx = await c.buildSelectiveContext()
            const result = await corrector.process(inp, selectiveCtx)
            res = result.final_response
            console.log(chalk.green(res))
            console.log('\n')
          } else {
            // Standard streaming chat
            const executor = new ToolStreamExecutor(coord, fmt)
            
            for await (const chunk of o.streamChat(c.forAPI())) {
              process.stdout.write(chalk.green(chunk))
              res += chunk
              
              // Process tools as they arrive (streaming execution)
              const toolsFound = executor.processChunk(chunk)
              for (const toolCall of toolsFound) {
                if (toolCall.tool === 'ask') {
                  // Handle ask tool - prompt user and continue
                  const q = toolCall.args.join(' ')
                  console.log(chalk.yellow(`\n❓ AI Question: ${q}`))
                  
                  // Get user answer synchronously within the async flow
                  const answer = await new Promise<string>(resolve => {
                    rl.question(chalk.blue('You: '), (ans) => resolve(ans))
                  })
                  
                  console.log(chalk.dim('\n✓ Continuing with your answer...\n'))
                  c.add('user', answer)
                  
                  // Continue the conversation with the answer
                  try {
                    let res2 = ''
                    for await (const chunk2 of o.streamChat(c.forAPI())) {
                      process.stdout.write(chalk.green(chunk2))
                      res2 += chunk2
                      
                      // Continue processing tools in continuation
                      const toolsFound2 = executor.processChunk(chunk2)
                      for (const tc2 of toolsFound2) {
                        if (tc2.tool !== 'ask') {
                          await executor.executeTool(tc2)
                        }
                      }
                    }
                    console.log('\n')
                    c.add('assistant', res2)
                  } catch (e) {
                    console.error(chalk.red(`\n✗ ${e instanceof Error ? e.message : String(e)}`))
                    coord.session.errors++
                  }
                } else {
                  // Execute other tools immediately
                  await executor.executeTool(toolCall)
                }
              }
            }
            console.log('\n')
            
            // Handle any remaining tools not yet processed
            const remaining = executor.flush()
            if (remaining.trim()) {
              const remainingTools = parse(remaining)
              for (const { tool, args } of remainingTools) {
                const result = await Promise.resolve(runTool(tool, ...args))
                console.log(fmt.res(tool, result))
                coord.recordTool(tool, result)
                if (tool === 'wf' || tool === 'fe') coord.recordFileOp('create', args[0])
                if (tool === 'rep' || tool === 'add') coord.recordFileOp('modify', args[0])
              }
            }
          }
          
          c.add('assistant', res)
          
          // Check for auto-compaction after response
          coord.recordContextSnapshot(c.get())

        } catch (e) {
          console.error(chalk.red(`\n✗ ${e instanceof Error ? e.message : String(e)}`))
          coord.session.errors++
        }

        ask()
      })
    }

    ask()
  }

}

p.command('chat [model]')
  .option('-u, --url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-s, --small-model-mode', 'Enable small model corrector (for 1B-8B models)')
  .option('--server <address>', 'Use remote Sircode server (format: ip:port or ip)')
  .option('-c, --cloudflare <model>', 'Use Cloudflare Workers AI (specify model, e.g. @cf/meta/llama-3.1-8b-instruct)')
  .option('-o, --openai <model>', 'Use OpenAI via Cloudflare Gateway (specify model, e.g. openai/gpt-5.4-nano)')
  .action(runChat)

p.command('models')
  .option('-u, --url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (opts: { url: string }) => {
    const o = new Ollama('mistral', opts.url)
    try {
      console.log(chalk.cyan('Models:'))
      const ms = await o.ls()
      ms.length ? ms.forEach(m => console.log(`  • ${m}`)) : console.log(chalk.yellow('  (none pulled)'))
    } catch (e) {
      console.error(chalk.red(`✗ ${e instanceof Error ? e.message : String(e)}`))
    }
  })

p.command('secure <file>')
  .description('Scan file for sensitive data (API keys, credentials, secrets)')
  .action((file: string) => {
    try {
      if (!existsSync(file)) {
        console.error(chalk.red(`✗ File not found: ${file}`))
        return
      }
      
      const content = readFileSync(file, 'utf8')
      const undercover = new UncoverMode()
      const report = undercover.getSecurityReport(content)
      
      console.log(fmt.hdr('Security Scan'))
      console.log(`File: ${file}`)
      console.log(`Status: ${report.isSafe ? chalk.green('✓ Safe') : chalk.red('⚠️ Issues Found')}`)
      
      if (report.issues > 0) {
        console.log(`\nIssues: ${report.issues} potential secrets`)
        console.log(`Categories: ${report.categories.join(', ')}`)
        console.log(`\n${report.recommendation}`)
        console.log('\nRedacted version would show:')
        const redacted = undercover.sanitizeForCommit(content)
        console.log(chalk.dim(redacted.slice(0, 200) + '...'))
      } else {
        console.log(chalk.green('\n✓ No sensitive data detected'))
      }
    } catch (e) {
      console.error(chalk.red(`✗ ${e instanceof Error ? e.message : String(e)}`))
    }
  })

p.command('memory <action> [query]')
  .description('Manage session memory (topics, transcripts, MEMORY.md)')
  .action((action: string, query: string | undefined) => {
    const memory = new MemorySystem()
    
    if (action === 'list') {
      const topics = memory.searchMemory('')
      console.log(fmt.hdr('Memory Topics'))
      topics.forEach(t => console.log(`  • ${t.topic}`))
    } else if (action === 'search' && query) {
      const results = memory.searchMemory(query)
      console.log(fmt.hdr(`Memory Search: "${query}"`))
      results.forEach(r => console.log(`  • ${r.topic}`))
    } else if (action === 'stats') {
      const stats = memory.getStats()
      console.log(fmt.hdr('Memory Statistics'))
      console.log(`Topics: ${stats.topicFiles}`)
      console.log(`Transcripts: ${stats.transcripts}`)
    } else {
      console.log('Usage: sircode memory <list|search|stats> [query]')
    }
  })

p.command('exec <q>')
  .option('-u, --url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-m, --model <model>', 'Model', 'mistral')
  .action(async (q: string, opts: { url: string; model: string }) => {
    const o = new Ollama(opts.model, opts.url)
    try {
      console.log(fmt.hdr('Sircode'))
      const res = await o.chat([{ role: 'user', content: q }])
      console.log(fmt.ai(res))
    } catch (e) {
      console.error(chalk.red(`✗ ${e instanceof Error ? e.message : String(e)}`))
      process.exit(1)
    }
  })

p.command('help').action(() => {
  console.log(fmt.hdr('Sircode'))
  console.log('Commands:')
  console.log('  chat [model]    Interactive chat')
  console.log('  models          List models')
  console.log('  exec <query>    Single query')
  console.log('  context         Show .code context & memory')
  console.log('  update          Update Sircode via git')
})

p.command('context').action(async () => {
  try {
    const { MemoryManager } = await import('./memory/manager.js')
    const mem = new MemoryManager(process.cwd())
    const ctx = mem.loadContext()
    const stats = mem.getStats()

    console.log(fmt.hdr('Context (.code/)'))
    console.log(chalk.cyan('📂 Session Context:'))
    if (ctx) {
      console.log(`  Model: ${ctx.model}`)
      console.log(`  CWD: ${ctx.cwd}`)
      console.log(`  Files created: ${ctx.files_created.length}`)
      console.log(`  Files modified: ${ctx.files_modified.length}`)
      console.log(`  Tools used: ${ctx.tools_used.join(', ')}`)
    } else {
      console.log('  (no context yet)')
    }

    console.log(chalk.cyan('\n📊 Memory Stats:'))
    console.log(`  Total events: ${stats.total}`)
    Object.entries(stats.by_type).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`)
    })

    console.log(chalk.cyan('\n🛠 Tools Used:'))
    Array.from(stats.tools).forEach(t => console.log(`    • ${t}`))
  } catch (e) {
    console.error(chalk.red(`✗ ${e instanceof Error ? e.message : String(e)}`))
  }
})

p.command('update').action(async () => {
  try {
    const findSircodeRepo = (): string | null => {
      const envDir = process.env.SIRCODE_INSTALL_DIR
      if (envDir && existsSync(`${envDir}/.git`)) return envDir

      try {
        const scriptPath = process.argv[1] ? realpathSync(process.argv[1]) : ''
        const repoDir = resolve(dirname(scriptPath), '..')
        if (existsSync(`${repoDir}/.git`)) return repoDir
      } catch {
        // Ignore resolution failures and fall through to the default install dir.
      }

      const defaultDir = `${process.env.HOME}/.local/share/sircode`
      if (existsSync(`${defaultDir}/.git`)) return defaultDir
      return null
    }

    const sirDir = findSircodeRepo()

    if (!sirDir) {
      console.error(chalk.red('✗ Sircode repo not found'))
      console.error(chalk.yellow('Please run: curl -sSL https://raw.githubusercontent.com/Sirco-web/Sircode/main/install.sh | bash'))
      process.exit(1)
    }
    
    console.log(chalk.cyan(`📦 Updating from ${sirDir}...`))
    
    const { stdout: before } = await ex(`cd ${sirDir} && git rev-parse --short HEAD`)
    await ex(`cd ${sirDir} && git pull origin main`)
    const { stdout: after } = await ex(`cd ${sirDir} && git rev-parse --short HEAD`)
    
    if (before.trim() === after.trim()) {
      console.log(chalk.yellow('✓ Already up to date'))
      return
    }
    
    console.log(chalk.cyan(`🔨 Building...`))
    await ex(`cd ${sirDir} && npm run build`)
    
    console.log(chalk.green('✅ Sircode updated!'))
    console.log(chalk.dim(`${before.trim()} → ${after.trim()}`))
  } catch (e) {
    console.error(chalk.red(`✗ Update failed: ${e instanceof Error ? e.message : String(e)}`))
    process.exit(1)
  }
})

// Settings configuration
interface SircodeSettings {
  provider: 'ollama' | 'cloudflare' | 'openai'
  model: string
  url: string
  cloudflareAccountId: string
  cloudflareApiToken: string
}

const defaultSettings = (): SircodeSettings => ({
  provider: 'ollama',
  model: 'mistral',
  url: 'http://localhost:11434',
  cloudflareAccountId: '',
  cloudflareApiToken: '',
})

const mergeSettings = (settings: Partial<SircodeSettings> | null | undefined): SircodeSettings => ({
  ...defaultSettings(),
  ...(settings ?? {}),
})

const getSettingsPath = (): string => {
  const configDir = `${process.env.HOME}/.config/sircode`
  return `${configDir}/settings.json`
}

const loadSettings = (): SircodeSettings | null => {
  const path = getSettingsPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const saveSettings = (settings: SircodeSettings): void => {
  const path = getSettingsPath()
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(settings, null, 2))
}

const promptForSettings = async (existing?: SircodeSettings): Promise<SircodeSettings> => {
  const current = mergeSettings(existing)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  
  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve))
  }

  console.log(fmt.hdr('Sircode Settings'))
  console.log(chalk.dim('Configure your default AI provider and credentials\n'))

  // Provider selection
  console.log('Select default provider:')
  console.log('  1) ollama    - Local Ollama (default)')
  console.log('  2) cloudflare - Cloudflare Workers AI')
  console.log('  3) openai    - OpenAI via Cloudflare Gateway')
  
  const providerLabel: Record<SircodeSettings['provider'], string> = {
    ollama: '1',
    cloudflare: '2',
    openai: '3',
  }
  const providerAns = await question(chalk.blue(`Provider [1-3] (${providerLabel[current.provider]}): `))
  const providerMap: Record<string, SircodeSettings['provider']> = {
    '1': 'ollama', '2': 'cloudflare', '3': 'openai'
  }
  const provider = providerMap[providerAns] || current.provider

  // Model
  let model = current.model
  if (provider === 'ollama') {
    model = await question(chalk.blue(`Model [${current.model}]: `)) || current.model
  } else if (provider === 'cloudflare') {
    model = await question(chalk.blue(`Cloudflare model [${current.model}]: `)) || current.model
  } else {
    model = await question(chalk.blue(`OpenAI model [${current.model}]: `)) || current.model
  }

  // URL (for Ollama)
  let url = current.url
  if (provider === 'ollama') {
    url = await question(chalk.blue(`Ollama URL [${current.url}]: `)) || current.url
  }

  // Cloudflare credentials
  let cloudflareAccountId = current.cloudflareAccountId
  let cloudflareApiToken = current.cloudflareApiToken
  if (provider === 'cloudflare' || provider === 'openai') {
    cloudflareAccountId = await question(chalk.blue(`Cloudflare Account ID [${current.cloudflareAccountId || 'empty'}]: `)) || current.cloudflareAccountId
    cloudflareApiToken = await question(chalk.blue(`Cloudflare API Token [${current.cloudflareApiToken ? 'set' : 'empty'}]: `)) || current.cloudflareApiToken
  }

  rl.close()

  return { provider, model, url, cloudflareAccountId, cloudflareApiToken }
}

const renderSettingsSummary = (settings: SircodeSettings | null): void => {
  console.log(fmt.hdr('Sircode Settings'))
  if (!settings) {
    console.log(chalk.yellow('No settings configured'))
    return
  }

  console.log(chalk.cyan('Current Configuration:'))
  console.log(`  Provider: ${settings.provider}`)
  console.log(`  Model: ${settings.model}`)
  console.log(`  URL: ${settings.url}`)
  if (settings.cloudflareAccountId) {
    console.log(`  Cloudflare Account: ${chalk.dim(settings.cloudflareAccountId.slice(0, 8))}...`)
    console.log(`  Cloudflare Token: ${chalk.dim('*'.repeat(8))}...`)
  } else {
    console.log(`  Cloudflare: ${chalk.dim('not configured')}`)
  }
}

const runSettingsMenu = async (): Promise<void> => {
  let settings = mergeSettings(loadSettings())
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve))
  }

  const pause = async (): Promise<void> => {
    await question(chalk.dim('\nPress Enter to continue...'))
  }

  const refresh = (): void => {
    settings = mergeSettings(loadSettings())
  }

  const editProvider = async (): Promise<void> => {
    console.log(chalk.cyan('\nSelect provider:'))
    console.log('  1) ollama')
    console.log('  2) cloudflare')
    console.log('  3) openai')
    const next = await question(chalk.blue(`Provider [${settings.provider}]: `))
    const providerMap: Record<string, SircodeSettings['provider']> = {
      '1': 'ollama',
      '2': 'cloudflare',
      '3': 'openai',
    }
    const provider = providerMap[next] || settings.provider
    settings = { ...settings, provider }
    saveSettings(settings)
    console.log(chalk.green('✓ Provider updated'))
  }

  const editModel = async (): Promise<void> => {
    const label = settings.provider === 'ollama'
      ? 'Model'
      : settings.provider === 'cloudflare'
        ? 'Cloudflare model'
        : 'OpenAI model'
    const value = await question(chalk.blue(`${label} [${settings.model}]: `))
    settings = { ...settings, model: value || settings.model }
    saveSettings(settings)
    console.log(chalk.green('✓ Model updated'))
  }

  const editUrl = async (): Promise<void> => {
    const value = await question(chalk.blue(`Ollama URL [${settings.url}]: `))
    settings = { ...settings, url: value || settings.url }
    saveSettings(settings)
    console.log(chalk.green('✓ URL updated'))
  }

  const editCredentials = async (): Promise<void> => {
    const accountId = await question(chalk.blue(`Cloudflare Account ID [${settings.cloudflareAccountId || 'empty'}]: `))
    const token = await question(chalk.blue(`Cloudflare API Token [${settings.cloudflareApiToken ? 'set' : 'empty'}]: `))
    settings = {
      ...settings,
      cloudflareAccountId: accountId || settings.cloudflareAccountId,
      cloudflareApiToken: token || settings.cloudflareApiToken,
    }
    saveSettings(settings)
    console.log(chalk.green('✓ Cloudflare credentials updated'))
  }

  const resetAll = async (): Promise<void> => {
    const next = await promptForSettings(settings)
    settings = next
    saveSettings(settings)
    console.log(chalk.green('✓ Settings saved'))
  }

  const clearAll = async (): Promise<void> => {
    const path = getSettingsPath()
    if (existsSync(path)) {
      const fs = await import('fs')
      fs.unlinkSync(path)
      settings = mergeSettings(null)
      console.log(chalk.green('✓ Settings cleared'))
    } else {
      console.log(chalk.yellow('No settings to clear'))
    }
  }

  const menu = async (): Promise<void> => {
    refresh()
    console.log()
    renderSettingsSummary(loadSettings())
    console.log(chalk.cyan('\nMenu:'))
    console.log('  1) Edit provider')
    console.log('  2) Edit model')
    console.log('  3) Edit URL')
    console.log('  4) Edit Cloudflare credentials')
    console.log('  5) Re-run full setup')
    console.log('  6) Clear settings')
    console.log('  7) Refresh')
    console.log('  0) Exit')

    const choice = (await question(chalk.blue('\nSelect an option: '))).trim()

    switch (choice) {
      case '1':
        await editProvider()
        break
      case '2':
        await editModel()
        break
      case '3':
        await editUrl()
        break
      case '4':
        await editCredentials()
        break
      case '5':
        await resetAll()
        break
      case '6':
        await clearAll()
        break
      case '7':
        refresh()
        console.log(chalk.green('✓ Refreshed'))
        break
      case '0':
      case 'exit':
      case 'quit':
        rl.close()
        return
      default:
        console.log(chalk.yellow('Unknown option'))
        break
    }

    await pause()
    await menu()
  }

  rl.on('close', () => {
    console.log(chalk.dim('\nLeaving settings menu'))
  })

  await menu()
}

p.command('settings [action]')
  .description('Manage Sircode settings (default provider, API tokens)')
  .action(async (action?: string) => {
    if (!action) {
      await runSettingsMenu()
      return
    }

    if (action === 'set') {
      const newSettings = await promptForSettings(loadSettings() ?? undefined)
      saveSettings(newSettings)
      console.log(chalk.green('\n✅ Settings saved!'))
      return
    }

    if (action === 'clear') {
      const path = getSettingsPath()
      if (existsSync(path)) {
        const fs = await import('fs')
        fs.unlinkSync(path)
        console.log(chalk.green('✓ Settings cleared'))
      } else {
        console.log(chalk.yellow('No settings to clear'))
      }
      return
    }

    console.log(chalk.yellow(`Unknown settings action: ${action}`))
    console.log(chalk.dim('Run: sircode settings'))
  })

p.command('agent [model]')
  .description('Autonomous agent mode with thinking and auto-execution')
  .option('-u, --url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (model: string | undefined, opts: { url: string }) => {
    const m = model || 'mistral'
    console.log(fmt.hdr(`🤖 Sircode Agent: ${m}`))

    const o = new Ollama(m, opts.url)
    const c = new ContextService(m)
    const coord = new SessionCoordinator(process.cwd(), m)
    const agent = new Agent(o, c, coord)

    console.log(chalk.dim('Checking Ollama...'))
    const ok = await ensureOllama(opts.url)
    
    if (!ok) {
      console.error(chalk.red(`✗ Can't reach Ollama at ${opts.url}`))
      console.error(chalk.red('Make sure Ollama is installed: https://ollama.ai'))
      process.exit(1)
    }

    console.log(chalk.green('✓ OK'))
    console.log(chalk.cyan('📚 Available Skills:'))
    const skills = agent.getAvailableSkills()
    skills.slice(0, 10).forEach(s => console.log(chalk.dim(`  • ${s.name}: ${s.description}`)))
    if (skills.length > 10) {
      console.log(chalk.dim(`  ... and ${skills.length - 10} more`))
    }
    console.log(chalk.dim(`Session: ${coord.session.id}`))
    console.log()

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    rl.on('close', () => {
      coord.close()
      console.log(chalk.dim(`\n📦 Session saved to .code/`))
    })

    const ask = (): void => {
      rl.question(chalk.blue('Agent: '), async (inp: string) => {
        if (inp.toLowerCase() === 'exit') {
          console.log(chalk.cyan('bye'))
          rl.close()
          return
        }

        if (inp.toLowerCase() === 'help') {
          console.log(chalk.cyan(`
Agent Commands:
  exit          Leave agent mode
  skills        List all available skills
  help          Show this help
  
Or ask the agent to do anything! Example:
  "Create a TypeScript utility for validating emails"
  "Debug this JavaScript error: ${new Error('test').toString()}"
  "Add unit tests to src/utils.ts"
          `))
          ask()
          return
        }

        if (inp.toLowerCase() === 'skills') {
          console.log(chalk.cyan('📚 Available Skills:'))
          agent.getAvailableSkills().forEach(s => {
            console.log(chalk.dim(`  ✓ ${s.name} (${s.category}): ${s.description}`))
            if (s.tools.length > 0) {
              console.log(chalk.dim(`    Tools: ${s.tools.join(', ')}`))
            }
          })
          ask()
          return
        }

        if (!inp.trim()) {
          ask()
          return
        }

        coord.recordMessage()
        console.log()

        try {
          // Process request with autonomous agent
          const result = await agent.processRequest(inp)

          console.log(chalk.green('\n✅ Autonomous execution complete!\n'))
          console.log(chalk.cyan(`Plan had ${result.thinking.plan.length} steps`))
          console.log(chalk.green(`Executed ${result.execution.successfulSteps} steps successfully`))
          
          if (result.execution.failedSteps > 0) {
            console.log(chalk.yellow(`⚠️  ${result.execution.failedSteps} steps failed`))
          }

          if (process.env.DEBUG_EXECUTION) {
            console.log(chalk.dim('\nDetailed Summary:'))
            console.log(chalk.dim(result.summary))
          }
        } catch (e) {
          console.error(chalk.red(`\n✗ Agent failed: ${e instanceof Error ? e.message : String(e)}`))
          coord.session.errors++
        }

        console.log()
        ask()
      })
    }

    ask()
  })

p.command('server')
  .option('-p, --port <port>', 'Server port', '8093')
  .option('-h, --host <host>', 'Server host', '0.0.0.0')
  .option('-v, --verbose', 'Verbose output')
  .description('Start Sircode server for distributed inference')
  .action(async (opts: { port: string; host: string; verbose: boolean }) => {
    const port = parseInt(opts.port, 10)

    console.log(fmt.hdr('Sircode Server'))
    console.log(chalk.cyan(`🚀 Starting server on port ${port}...`))
    console.log()

    // Show GPU info
    const gpu = GPUDetector.detect()
    console.log(chalk.bold(`GPU Detection:`))
    console.log(GPUDetector.format(gpu))
    console.log()

    try {
      const server = new SircodeServer({
        port,
        host: opts.host,
        verbose: opts.verbose,
      })

      await server.start()

      // Handle shutdown gracefully
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n⏹️  Shutting down...'))
        await server.stop()
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        console.log(chalk.yellow('\n⏹️  Shutting down...'))
        await server.stop()
        process.exit(0)
      })
    } catch (e) {
      console.error(chalk.red(`✗ Failed to start server:`))
      console.error(chalk.red(e instanceof Error ? e.message : String(e)))
      process.exit(1)
    }
  })

p.parse(process.argv)
if (process.argv.length < 3) p.help()
