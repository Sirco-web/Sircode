#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import * as readline from 'readline'
import { Ollama } from './services/ollama.js'
import { ContextService } from './services/context.js'
import { run as runTool } from './tools/index.js'
import { fmt, parse } from './utils/index.js'

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

    if (!await o.ok()) {
      console.error(chalk.red(`✗ Can't reach Ollama at ${opts.url}`))
      console.error(chalk.red('Run: ollama serve'))
      process.exit(1)
    }

    console.log(chalk.green('✓ OK'))
    console.log(chalk.dim(`Tools: ${(await import('./tools/index.js')).ls().map(t => t.name).join(', ')}`))
    console.log()

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    const ask = (): void => {
      rl.question(chalk.blue('You: '), async (inp: string) => {
        if (inp.toLowerCase() === 'exit') { console.log(chalk.cyan('bye')); rl.close(); return }
        if (inp.toLowerCase() === 'models') { console.log(chalk.cyan((await o.ls()).join(', '))); ask(); return }
        if (inp.toLowerCase() === 'clear') { c.clear(); console.log(chalk.yellow('cleared')); ask(); return }
        if (!inp.trim()) { ask(); return }

        c.add('user', inp)
        console.log(chalk.dim('...'))

        try {
          const res = await o.chat(c.forAPI())
          c.add('assistant', res)
          console.log('\n' + fmt.ai(fmt.trunc(res, 1500)))

          parse(res).forEach(({ tool, args }) => {
            const r = runTool(tool, ...args)
            console.log(fmt.res(tool, r))
          })
          console.log()
        } catch (e) {
          console.error(chalk.red(`✗ ${e instanceof Error ? e.message : String(e)}`))
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
})

p.parse(process.argv)
if (process.argv.length < 3) p.help()
