/**
 * Frustration Detection Service
 * Detects user frustration, profanity, and negative sentiment in messages
 * Flags interactions as negative for session tracking
 */

export interface FrustrationAnalysis {
  isFrustrated: boolean
  profanityScore: number
  negativeScore: number
  triggers: string[]
  message: string
}

export class FrustrationDetector {
  // Profanity patterns (extended set)
  private readonly PROFANITY_PATTERNS = [
    /\b(fuck|shit|crap|damn|hell|piss|ass|asshole|bastard|bitch|dammit|goddamn|wtf|stfu)\b/gi,
    /\b(sucks?|terrible|awful|horrible|disgusting|revolting|vile)\b/gi
  ]

  // Frustration triggers
  private readonly FRUSTRATION_PATTERNS = [
    /\b(why|how|what)\s+is\s+this.*\b(broken|not\s+working|trash|garbage|fail)/gi,
    /\b(stop|don't|can't|won't|doesn't|shouldn't|can't.*work)\b/gi,
    /\b(not|n't|no|off|wrong|error|bug|crash|freeze|hang|broken|fail)\b/gi,
    /\b(again|still|yet|already|too|more|much|very|really|extremely)\b.*\b(bad|wrong|broken|fail)\b/gi,
    /!!!+|...+/g  // Multiple punctuation
  ]

  // Negative sentiment keywords
  private readonly NEGATIVE_KEYWORDS = [
    'hate', 'hated', 'awful', 'terrible', 'horrible', 'disgusting', 'useless',
    'waste', 'stupid', 'idiot', 'dumb', 'trash', 'garbage', 'broken', 'fail',
    'failed', 'losing', 'lost', 'frustrated', 'annoyed', 'angry', 'furious',
    'mad', 'pissed', 'sucks', 'sucked', 'dying', 'dead', 'stuck', 'trapped'
  ]

  // Positive sentiment keywords (to reduce frustration score)
  private readonly POSITIVE_KEYWORDS = [
    'please', 'thanks', 'thank', 'appreciate', 'appreciated', 'grateful',
    'love', 'loved', 'great', 'awesome', 'amazing', 'wonderful', 'excellent',
    'fantastic', 'perfect', 'better', 'improved', 'working', 'fixed'
  ]

  /**
   * Analyze user message for frustration signals
   */
  analyze(input: string): FrustrationAnalysis {
    const triggers: string[] = []
    let profanityScore = 0
    let negativeScore = 0

    // Check profanity
    for (const pattern of this.PROFANITY_PATTERNS) {
      const matches = input.match(pattern)
      if (matches) {
        profanityScore += matches.length * 2
        triggers.push(`Profanity(${matches.length}): ${[...new Set(matches.map(m => m.toLowerCase()))].join(', ')}`)
      }
    }

    // Check frustration patterns
    for (const pattern of this.FRUSTRATION_PATTERNS) {
      const matches = input.match(pattern)
      if (matches) {
        negativeScore += matches.length
        const uniqueMatches = [...new Set(matches)]
        if (uniqueMatches.length > 0 && uniqueMatches[0].length < 50) {
          triggers.push(`Pattern: ${uniqueMatches[0].toLowerCase()}`)
        }
      }
    }

    // Check negative keywords
    const words = input.toLowerCase().split(/\s+/)
    for (const word of words) {
      if (this.NEGATIVE_KEYWORDS.some(kw => word.includes(kw))) {
        negativeScore++
      }
      if (this.POSITIVE_KEYWORDS.some(kw => word.includes(kw))) {
        negativeScore = Math.max(0, negativeScore - 0.5)
      }
    }

    const isFrustrated = profanityScore >= 2 || negativeScore >= 3

    return {
      isFrustrated,
      profanityScore,
      negativeScore,
      triggers,
      message: input
    }
  }

  /**
   * Get severity level (low, medium, high)
   */
  getSeverity(analysis: FrustrationAnalysis): 'low' | 'medium' | 'high' {
    const totalScore = analysis.profanityScore + analysis.negativeScore
    if (totalScore >= 8) return 'high'
    if (totalScore >= 4) return 'medium'
    return 'low'
  }

  /**
   * Format analysis for logging
   */
  formatForLog(analysis: FrustrationAnalysis): string {
    if (!analysis.isFrustrated) return '✓ Neutral sentiment'
    const severity = this.getSeverity(analysis)
    return `⚠️ ${severity.toUpperCase()}: ${analysis.triggers.join(' | ')}`
  }
}
