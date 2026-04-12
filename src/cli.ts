#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import * as readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { Ollama } from './services/ollama.js'
import { ContextService } from './services/context.js'
import { SessionCoordinator } from './coordinator/session.js'
import { run as runTool } from './tools/index.js'
import { fmt, parse } from './utils/index.js'

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

    if (!await o.ok()) {
      console.error(chalk.red(`✗ Can't reach Ollama at ${opts.url}`))
      console.error(chalk.red('Run: ollama serve'))
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

        coord.recordMessage()
        c.add('user', inp)
        console.log(chalk.dim('streaming...\n'))
        
        try {
          let res = ''
          for await (const chunk of o.streamChat(c.forAPI())) {
            process.stdout.write(chalk.green(chunk))
            res += chunk
          }
          console.log('\n')
          
          c.add('assistant', res)
          
          const toolCalls = parse(res)
          if (toolCalls.length > 0) {
            toolCalls.forEach(({ tool, args }) => {
              const r = runTool(tool, ...args)
              console.log(fmt.res(tool, r))
              coord.recordTool(tool, r)
              if (tool === 'wf') coord.recordFileOp('create', args[0])
              if (tool === 'rep' || tool === 'add') coord.recordFileOp('modify', args[0])
            })
            console.log()
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

p.parse(process.argv)
if (process.argv.length < 3) p.help()
