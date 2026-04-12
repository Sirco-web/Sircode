import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * FileEditTool - Advanced file editing with precise text replacement
 * Format: [fe: path, old_text, new_text, replace_all?]
 */

export interface FileEditResult {
  action: 'edit'
  path: string
  old: string
  new: string
  replaced: boolean
  linesChanged: number
}

export function fileEdit(
  path: string,
  oldText: string,
  newText: string,
  replaceAll = false,
): FileEditResult {
  const fullPath = resolve(path)
  const content = readFileSync(fullPath, 'utf-8')

  let newContent: string
  let replaced: boolean
  let count = 0

  if (replaceAll) {
    // Replace all occurrences
    newContent = content.split(oldText).join(newText)
    count = content.split(oldText).length - 1
    replaced = count > 0
  } else {
    // Replace only first occurrence
    if (content.includes(oldText)) {
      newContent = content.replace(oldText, newText)
      replaced = true
      count = 1
    } else {
      throw new Error(`Text not found: "${oldText.slice(0, 50)}..."`)
    }
  }

  writeFileSync(fullPath, newContent, 'utf-8')

  return {
    action: 'edit',
    path,
    old: oldText,
    new: newText,
    replaced,
    linesChanged: count,
  }
}
