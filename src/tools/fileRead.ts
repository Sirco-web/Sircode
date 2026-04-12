import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * FileReadTool - Advanced file reading with offset and limit
 * Format: [fr: path, offset?, limit?]
 */

export interface FileReadResult {
  action: 'read'
  path: string
  content: string
  totalLines: number
  returnedLines: number
  offset: number
  limit: number | null
}

export function fileRead(
  path: string,
  offset = 1,
  limit: number | null = null,
): FileReadResult {
  const fullPath = resolve(path)
  const content = readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')
  const totalLines = lines.length

  // Clamp offset to valid range
  const startIdx = Math.max(0, Math.min(offset - 1, totalLines - 1))
  const endIdx = limit
    ? Math.min(startIdx + limit, totalLines)
    : totalLines

  const returnedLines = Math.max(0, endIdx - startIdx)
  const selectedLines = lines.slice(startIdx, endIdx)

  // Format with line numbers if returning content
  const formattedContent = selectedLines
    .map((line, i) => {
      const lineNum = startIdx + i + 1
      return `${lineNum.toString().padStart(4)} | ${line}`
    })
    .join('\n')

  return {
    action: 'read',
    path,
    content: formattedContent,
    totalLines,
    returnedLines,
    offset,
    limit: limit || null,
  }
}
