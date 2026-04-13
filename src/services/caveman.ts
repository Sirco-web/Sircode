/**
 * Caveman Token Compression
 * Reduces output tokens by ~60-75% while preserving technical accuracy
 * 
 * Rules (from https://github.com/JuliusBrussee/caveman):
 * - Remove: articles (a, an, the), filler (just, really, basically), pleasantries, hedging
 * - Compress: use short synonyms, fragments OK, drop "you should"
 * - Preserve: code blocks, URLs, file paths, commands, technical terms, headings
 */

export class CavemanCompress {
  private static readonly FILLER_WORDS = [
    'just', 'really', 'basically', 'actually', 'simply', 'essentially', 
    'generally', 'sort of', 'kind of', 'a bit', 'quite', 'rather',
    'for sure', 'in fact', 'as a matter of fact', 'one could argue'
  ]

  private static readonly PLEASANTRIES = [
    'sure', 'certainly', 'of course', 'happy to', "i'd recommend", 'i think',
    'i believe', 'thank you', 'thanks', 'please', 'would you'
  ]

  private static readonly HEDGING = [
    "it might be worth", "you could consider", "it would be good to",
    "maybe you should", "you might want to", "consider", "possibly"
  ]

  private static readonly REDUNDANT: Record<string, string> = {
    'in order to': 'to',
    'make sure to': 'ensure',
    'the reason is because': 'because',
    'in addition': 'also',
    'furthermore': 'also',
    'additionally': 'also',
    'however': 'but',
    'on the other hand': 'but',
    'please make sure to': '',
    'you should always': '',
    'you must always': '',
    'do not forget to': '',
    'remember to': ''
  }

  private static readonly SYNONYMS: Record<string, string> = {
    'extensive': 'big',
    'utilize': 'use',
    'implement a solution for': 'fix',
    'a lot of': 'lots of',
    'quite a bit': 'much',
    'provide': 'give',
    'demonstrate': 'show',
    'investigate': 'check',
    'determine': 'find',
    'generate': 'make',
    'optimize': 'speed up',
    'subsequent': 'next',
    'initial': 'first',
    'modification': 'change',
    'sufficient': 'enough'
  }

  /**
   * Compress text in caveman style
   */
  static compress(text: string, intensity: 'lite' | 'full' | 'ultra' = 'full'): string {
    // Preserve code blocks and inline code
    const codeBlocks = this.extractCodeBlocks(text)
    let compressed = text

    // Replace code blocks with placeholders
    codeBlocks.forEach((block, idx) => {
      compressed = compressed.replace(block, `__CODE_BLOCK_${idx}__`)
    })

    // Apply compressions based on intensity
    if (intensity === 'lite') {
      compressed = this.compressLite(compressed)
    } else if (intensity === 'full') {
      compressed = this.compressFull(compressed)
    } else if (intensity === 'ultra') {
      compressed = this.compressUltra(compressed)
    }

    // Restore code blocks
    codeBlocks.forEach((block, idx) => {
      compressed = compressed.replace(`__CODE_BLOCK_${idx}__`, block)
    })

    return compressed.trim()
  }

  private static extractCodeBlocks(text: string): string[] {
    const blocks: string[] = []
    const codeRegex = /```[\s\S]*?```|`[^`]+`/g
    let match
    while ((match = codeRegex.exec(text)) !== null) {
      blocks.push(match[0])
    }
    return blocks
  }

  private static compressLite(text: string): string {
    // Remove filler and pleasantries, keep structure
    let result = text
    
    // Remove filler words
    this.FILLER_WORDS.forEach(word => {
      result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), '')
    })

    // Remove pleasantries
    this.PLEASANTRIES.forEach(phrase => {
      result = result.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), '')
    })

    // Replace redundant phrases
    Object.entries(this.REDUNDANT).forEach(([old, neu]) => {
      result = result.replace(new RegExp(old, 'gi'), neu)
    })

    return result.replace(/\s+/g, ' ')
  }

  private static compressFull(text: string): string {
    let result = this.compressLite(text)

    // Replace synonyms
    Object.entries(this.SYNONYMS).forEach(([verbose, short]) => {
      result = result.replace(new RegExp(`\\b${verbose}\\b`, 'gi'), short)
    })

    // Remove articles (a, an, the) - full mode
    result = result.replace(/\b(a|an|the)\s+/gi, '')

    // Fragments OK - remove some verbs
    result = result.replace(/\b(should|must|can|will|could|would)\s+/gi, '')

    return result.replace(/\s+/g, ' ')
  }

  private static compressUltra(text: string): string {
    let result = this.compressFull(text)

    // Ultra compression - abbreviate common terms
    const abbreviations: Record<string, string> = {
      'database': 'DB',
      'authentication': 'auth',
      'configuration': 'config',
      'request': 'req',
      'response': 'res',
      'function': 'fn',
      'implementation': 'impl',
      'parameter': 'param',
      'because': '→',
      'therefore': '→'
    }

    Object.entries(abbreviations).forEach(([full, abbr]) => {
      result = result.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr)
    })

    return result.replace(/\s+/g, ' ')
  }

  /**
   * Estimate token reduction
   */
  static estimateReduction(original: string, compressed: string, intensity: 'lite' | 'full' | 'ultra' = 'full'): number {
    const origTokens = original.split(/\s+/).length
    const compTokens = compressed.split(/\s+/).length
    const reduction = ((origTokens - compTokens) / origTokens) * 100
    
    return Math.round(reduction * 10) / 10
  }
}

/**
 * Caveman mode helper for system prompt enhancement
 */
export function getCavemanSystemPrompt(basePrompt: string, intensity: 'lite' | 'full' | 'ultra' = 'full'): string {
  if (intensity === 'lite') {
    return `${basePrompt}

[CAVEMAN LITE MODE ACTIVE]
Respond concisely. Drop fluff. Keep articles/grammar. Professional but tight.`
  } else if (intensity === 'full') {
    return `${basePrompt}

[CAVEMAN FULL MODE ACTIVE]
Respond like smart caveman. All technical substance stay. Only fluff die.
Drop articles, fragments OK, short synonyms. Do not explain obvious things.`
  } else {
    return `${basePrompt}

[CAVEMAN ULTRA MODE ACTIVE]
Maximum compression mode. Use abbreviations (DB/auth/config/req/res/fn/impl).
Fragments only. One-word when one-word enough. Arrow for causality: X → Y.
Keep ALL technical accuracy. Zero loss of meaning.`
  }
}
