#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import * as readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { Ollama } from './services/ollama.js'
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

const ex = promisify(exec)

const p = new Command()
  .name('sircode')
  .description('Ollama CLI code assistant')
  .version('0.1.0')

p.command('chat [model]')
  .option('-u, --url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (model: string | undefined, opts: { url: string }) => {
    const m = model || 'mistral'
    console.log(fmt.hdr(`Sircode: ${m}`))

    const o = new Ollama(m, opts.url)
    const c = new ContextService(m)
    const coord = new SessionCoordinator(process.cwd(), m)
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
        console.log(chalk.dim('streaming...\n'))
        
        try {
          let res = ''
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
          
          c.add('assistant', res)
          
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
        } catch (e) {
          console.error(chalk.red(`\n✗ ${e instanceof Error ? e.message : String(e)}`))
          coord.session.errors++
        }

        ask()
      })
    }

    ask()
  })

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
    // Determine Sircode directory
    let sirDir = process.env.SIRCODE_INSTALL_DIR || `${process.env.HOME}/.local/share/sircode`
    
    // If default location doesn't exist, try to use the location of this script
    if (!existsSync(`${sirDir}/.git`)) {
      const scriptDir = dirname(process.argv[1])
      const repoDir = resolve(scriptDir, '..')
      if (existsSync(`${repoDir}/.git`)) {
        sirDir = repoDir
      }
    }
    
    if (!existsSync(`${sirDir}/.git`)) {
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

p.parse(process.argv)
if (process.argv.length < 3) p.help()
