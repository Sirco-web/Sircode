/**
 * Enhanced Memory System (MEMORY.md pattern)
 * Three-layer system: MEMORY.md (pointers), Topic Files (project knowledge), Raw Transcripts
 * Allows AI to maintain context across sessions without loading everything
 */

import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface MemoryPointer {
  id: string
  topic: string
  filename: string
  summary: string
  created: string
  updated: string
  relevance: number
}

export interface PersonalMemory {
  id: string
  content: string
  topic: string
  created: string
  tags: string[]
  importance: 'low' | 'medium' | 'high'
}

export class MemorySystem {
  private baseDir: string
  private memoryFile: string
  private topicsDir: string
  private transcriptsDir: string

  constructor(baseDir = '.code') {
    this.baseDir = baseDir
    this.memoryFile = join(baseDir, 'MEMORY.md')
    this.topicsDir = join(baseDir, 'topics')
    this.transcriptsDir = join(baseDir, 'transcripts')
    
    this.init()
  }

  /**
   * Initialize memory directories
   */
  private init(): void {
    try {
      if (!existsSync(this.baseDir)) mkdirSync(this.baseDir, { recursive: true })
      if (!existsSync(this.topicsDir)) mkdirSync(this.topicsDir, { recursive: true })
      if (!existsSync(this.transcriptsDir)) mkdirSync(this.transcriptsDir, { recursive: true })
      
      if (!existsSync(this.memoryFile)) {
        this.writePrimaryMemory([])
      }
    } catch (e) {
      console.error('Memory init error:', e)
    }
  }

  /**
   * Get or create topic file
   */
  saveTopicKnowledge(topic: string, content: string, tags: string[] = []): void {
    const filename = topic.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.md'
    const filepath = join(this.topicsDir, filename)
    
    const header = `# ${topic}\nTags: ${tags.join(', ')}\nUpdated: ${new Date().toISOString()}\n\n`
    writeFileSync(filepath, header + content, 'utf8')
    
    this.updateMemoryPointer({
      id: topic.replace(/\s+/g, '-'),
      topic,
      filename,
      summary: content.split('\n')[0].slice(0, 100),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      relevance: 0.7
    })
  }

  /**
   * Load topic knowledge
   */
  loadTopicKnowledge(topic: string): string | null {
    const filename = topic.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.md'
    try {
      const filepath = join(this.topicsDir, filename)
      if (existsSync(filepath)) {
        return readFileSync(filepath, 'utf8')
      }
    } catch (e) {
      console.error(`Error loading topic ${topic}:`, e)
    }
    return null
  }

  /**
   * Save session transcript
   */
  saveTranscript(sessionId: string, messages: Array<{role: string, content: string}>): void {
    const filename = `${sessionId}_${Date.now()}.json`
    const filepath = join(this.transcriptsDir, filename)
    
    writeFileSync(filepath, JSON.stringify({
      sessionId,
      timestamp: new Date().toISOString(),
      messages,
      summary: this.generateSummary(messages)
    }, null, 2), 'utf8')
  }

  /**
   * Update memory pointer (index)
   */
  private updateMemoryPointer(pointer: MemoryPointer): void {
    try {
      let pointers: MemoryPointer[] = []
      
      if (existsSync(this.memoryFile)) {
        const content = readFileSync(this.memoryFile, 'utf8')
        const match = content.match(/```json\n([\s\S]+?)\n```/)
        if (match) {
          pointers = JSON.parse(match[1])
        }
      }
      
      // Update or add pointer
      const idx = pointers.findIndex(p => p.id === pointer.id)
      if (idx >= 0) {
        pointers[idx] = pointer
      } else {
        pointers.push(pointer)
      }
      
      this.writePrimaryMemory(pointers)
    } catch (e) {
      console.error('Error updating memory pointer:', e)
    }
  }

  /**
   * Write MEMORY.md file with pointers
   */
  private writePrimaryMemory(pointers: MemoryPointer[]): void {
    const header = `# MEMORY.md - Session Context Index

This file indexes all persistent knowledge. Load relevant topics as needed.

## Pointers (Quick Access)
`
    
    const pointerList = pointers
      .sort((a, b) => b.relevance - a.relevance)
      .map(p => `- **${p.topic}** (${p.filename}): ${p.summary}`)
      .join('\n')
    
    const content = `${header}
${pointerList}

## Topics Directory
Each topic stored as separate markdown file for efficient lookup.

## Transcripts Directory
Raw session transcripts in JSON format for reference.

## Usage for AI
When user mentions a topic:
1. Check MEMORY.md for pointer
2. Load relevant topic file from topics/
3. Inject into system context
4. Save response summary back to topic file

\`\`\`json
${JSON.stringify(pointers, null, 2)}
\`\`\`
`
    
    try {
      writeFileSync(this.memoryFile, content, 'utf8')
    } catch (e) {
      console.error('Error writing MEMORY.md:', e)
    }
  }

  /**
   * Generate summary from messages
   */
  private generateSummary(messages: Array<{role: string, content: string}>): string {
    if (messages.length === 0) return 'Empty session'
    
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) return 'No user input'
    
    const first = userMessages[0].content.slice(0, 100)
    const last = userMessages[userMessages.length - 1].content.slice(0, 50)
    
    return `${first}...${last}`
  }

  /**
   * Get memory stats
   */
  getStats(): {
    topicFiles: number
    transcripts: number
    pointers: number
  } {
    try {
      const topics = existsSync(this.topicsDir) 
        ? readFileSync(this.topicsDir, 'utf8').split('\n').filter(x => x)
        : []
      const transcripts = existsSync(this.transcriptsDir)
        ? readFileSync(this.transcriptsDir, 'utf8').split('\n').filter(x => x)
        : []
      
      return {
        topicFiles: topics.length,
        transcripts: transcripts.length,
        pointers: 0
      }
    } catch {
      return { topicFiles: 0, transcripts: 0, pointers: 0 }
    }
  }

  /**
   * Search memory
   */
  searchMemory(query: string): {topic: string, filename: string}[] {
    try {
      if (!existsSync(this.topicsDir)) return []
      
      const files = readFileSync(this.topicsDir, 'utf8').split('\n')
      const q = query.toLowerCase()
      
      return files
        .filter(f => f && f.toLowerCase().includes(q))
        .map(f => ({
          topic: f.replace(/_/g, ' ').replace('.md', ''),
          filename: f
        }))
    } catch (e) {
      console.error('Memory search error:', e)
      return []
    }
  }
}
