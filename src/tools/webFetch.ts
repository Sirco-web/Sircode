import { execSync } from 'child_process'

/**
 * WebFetchTool - Fetch URL content
 * Format: [wf: url, prompt?]
 */

export interface WebFetchResult {
  action: 'web_fetch'
  url: string
  status: number
  contentLength: number
  content: string
  error?: string
}

export async function webFetch(
  url: string,
  prompt = 'Extract key information',
): Promise<WebFetchResult> {
  try {
    // Validate URL
    try {
      new URL(url)
    } catch {
      return {
        action: 'web_fetch',
        url,
        status: 0,
        contentLength: 0,
        content: '',
        error: `Invalid URL: ${url}`,
      }
    }

    // Use curl to fetch with timeout
    const result = execSync(`curl -s -m 10 --max-filesize 10485760 "${url}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })

    // Simple HTML stripping (just remove tags)
    const text = result
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n\n+/g, '\n')
      .trim()

    return {
      action: 'web_fetch',
      url,
      status: 200,
      contentLength: text.length,
      content: text.slice(0, 5000), // Limit to 5KB
    }
  } catch (e) {
    const err = e as any
    return {
      action: 'web_fetch',
      url,
      status: err.status || 500,
      contentLength: 0,
      content: '',
      error: err.message || 'Failed to fetch URL',
    }
  }
}
