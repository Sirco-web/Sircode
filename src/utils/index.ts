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
  // Match [tool: ...content...] - handles content with ] by matching to the LAST ]
  const re = /\[([a-z_]+):(.*?)\](?=\s|$|[\[\]])/gs
  const m: Array<{ tool: string; args: string[] }> = []
  let x
  while ((x = re.exec(s)) !== null) {
    const tool = x[1]
    const content = x[2].trim()
    
    // For tools that handle file content, be smarter about parsing
    if (['wf', 'fe', 'rep', 'add'].includes(tool)) {
      // For these tools, only split on the first 1-2 commas depending on tool
      if (tool === 'wf' || tool === 'add') {
        // Format: [wf: path, content] - split on first comma only
        const commaIdx = content.indexOf(',')
        if (commaIdx > -1) {
          const path = content.slice(0, commaIdx).trim()
          const fileContent = content.slice(commaIdx + 1).trim()
          m.push({ tool, args: [path, fileContent] })
        } else {
          m.push({ tool, args: [content] })
        }
      } else if (tool === 'rep' || tool === 'fe') {
        // Format: [rep: path, old, new] - split on first 2 commas
        const parts = content.split(',')
        if (parts.length >= 3) {
          m.push({ tool, args: [parts[0].trim(), parts[1].trim(), parts.slice(2).join(',').trim()] })
        } else {
          m.push({ tool, args: parts.map(p => p.trim()) })
        }
      }
    } else {
      // For other tools, split normally by comma
      m.push({ tool, args: content.split(',').map(a => a.trim()) })
    }
  }
  return m
}
