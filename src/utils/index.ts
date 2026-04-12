import chalk from 'chalk'

export const fmt = {
  res(name: string, r: { ok: boolean; out: string; err?: string; ms: number }) {
    const s = r.ok ? chalk.green('✓') : chalk.red('✗')
    return `${s} ${name} (${r.ms}ms)\n${r.out}${r.err ? `\n${chalk.red(r.err)}` : ''}`
  },
  ai(s: string) { return chalk.cyan(s) },
  user(s: string) { return chalk.blue(`You: ${s}`) },
  hdr(t: string) { return chalk.bold.cyan(`\n━ ${t} ━\n`) },
  trunc(s: string, n = 500) { return s.length <= n ? s : s.slice(0, n) + chalk.dim(`\n... +${s.length - n} chars`) },
}

export const parse = (s: string) => {
  const re = /\[([a-z_]+):\s*([^\]]+)\]/g
  const m: Array<{ tool: string; args: string[] }> = []
  let x
  while ((x = re.exec(s)) !== null) m.push({ tool: x[1], args: x[2].split(',').map(a => a.trim()) })
  return m
}
