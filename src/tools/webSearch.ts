/**
 * WebSearchTool - Search the web
 * Format: [ws: query, max_results?]
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface WebSearchResult {
  action: 'web_search'
  query: string
  results: SearchResult[]
  error?: string
}

export async function webSearch(
  query: string,
  maxResults = 5,
): Promise<WebSearchResult> {
  try {
    // DuckDuckGo search endpoint (no API key needed, but limited)
    // For production, you'd use Google Custom Search or similar
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(
      query,
    )}&format=json&pretty=1`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Sircode/1.0',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!response.ok) {
      return {
        action: 'web_search',
        query,
        results: [],
        error: `Search failed with status ${response.status}`,
      }
    }

    const data: any = await response.json()

    // Parse DuckDuckGo response
    const results: SearchResult[] = (data.RelatedTopics || [])
      .slice(0, maxResults)
      .map((item: any) => ({
        title: item.Text?.split(' - ')[0] || item.Result || 'Untitled',
        url: item.FirstURL || '#',
        snippet: item.Text || '',
      }))
      .filter((r: SearchResult) => r.url !== '#')

    return {
      action: 'web_search',
      query,
      results: results.slice(0, maxResults),
    }
  } catch (e) {
    const err = e as any
    return {
      action: 'web_search',
      query,
      results: [],
      error: err.message || 'Search failed',
    }
  }
}
