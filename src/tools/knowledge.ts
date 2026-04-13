import { KnowledgeBase, KnowledgeEntry } from '../services/knowledge.js'
import type { ToolRes } from '../types/index.js'

interface KnowledgeQueryResult {
  query: string
  results: Array<{ topic: string; content: string }>
  error?: string
}

/**
 * Knowledge lookup tool for small models
 * Queries coding knowledge database
 */
export function queryKnowledge(query: string, limit = 3): KnowledgeQueryResult {
  try {
    if (!query || query.trim().length === 0) {
      return {
        query: '',
        results: [],
        error: 'empty query'
      }
    }

    const entries = KnowledgeBase.search(query, limit)
    
    return {
      query,
      results: entries.map(e => ({
        topic: e.topic,
        content: e.content
      }))
    }
  } catch (e) {
    return {
      query,
      results: [],
      error: e instanceof Error ? e.message : 'unknown error'
    }
  }
}

/**
 * Tool wrapper for tool registry
 */
export function knowledgeQuery(...args: string[]): ToolRes {
  try {
    const query = args.join(' ')
    const result = queryKnowledge(query, 5)
    
    return {
      ok: result.results.length > 0,
      out: JSON.stringify(result, null, 2),
      ms: 0
    }
  } catch (e) {
    return {
      ok: false,
      out: '',
      err: e instanceof Error ? e.message : 'error',
      ms: 0
    }
  }
}
