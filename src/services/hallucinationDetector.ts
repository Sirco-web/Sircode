/**
 * Hallucination Detection & Mitigation
 * Identifies when the agent is generating plausible-but-false information
 * Inspired by Claude's safety mechanisms
 */

export interface HallucinationRisk {
  score: number // 0-1
  signals: HallucinationSignal[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
  shouldGroundWithTools: boolean
  suggestedTools: string[]
}

export interface HallucinationSignal {
  type:
    | 'confidence-without-source'
    | 'fake-citation'
    | 'invented-api'
    | 'uncertain-knowledge'
    | 'pattern-drift'
    | 'fact-claim-without-grounding'
  description: string
  weight: number // 0-1, how much this signals hallucination
}

export class HallucinationDetector {
  private hallucPatterns = [
    // Confidence indicators without grounding
    {
      pattern: /^(definitely|certainly|obviously|clearly)/i,
      weight: 0.15,
      type: 'confidence-without-source' as const,
    },
    // Fake citations
    { pattern: /\[citation needed\]/i, weight: 0.3, type: 'fake-citation' as const },
    {
      pattern: /according to [a-z\s]+\d+/i,
      weight: 0.2,
      type: 'fake-citation' as const,
    },
    // Invented APIs/methods
    { pattern: /\.fakeFn\(|\.notRealMethod\(/i, weight: 0.4, type: 'invented-api' as const },
    // Hedging language (uncertainty)
    {
      pattern: /^(i think|maybe|probably|might|could|seems|appears)/i,
      weight: -0.1,
      type: 'uncertain-knowledge' as const,
    },
    // Pattern drift (code that doesn't match input patterns)
    { pattern: /TODO|FIXME|placeholder/i, weight: 0.2, type: 'pattern-drift' as const },
  ]

  /**
   * Analyze text for hallucination signals
   */
  analyze(text: string, context: { hasGrounding?: boolean; toolsAvailable?: string[] } = {}): HallucinationRisk {
    const signals: HallucinationSignal[] = []
    let totalSignalWeight = 0

    // Check patterns
    this.hallucPatterns.forEach(({ pattern, weight, type }) => {
      if (pattern.test(text)) {
        signals.push({
          type,
          description: this.describeSignal(type),
          weight: Math.max(0, weight),
        })
        totalSignalWeight += Math.max(0, weight)
      }
    })

    // Check for fact claims without grounding
    const factClaims = this.extractFactClaims(text)
    if (factClaims.length > 0 && !context.hasGrounding) {
      signals.push({
        type: 'fact-claim-without-grounding',
        description: `${factClaims.length} factual claims made without data source`,
        weight: 0.2,
      })
      totalSignalWeight += 0.2
    }

    // Normalize score to 0-1
    const score = Math.min(1, totalSignalWeight / 2)

    // Determine severity
    const severity =
      score < 0.2 ? 'low' : score < 0.4 ? 'medium' : score < 0.7 ? 'high' : 'critical'

    // Suggest tools for grounding
    const suggestedTools =
      severity === 'high' || severity === 'critical'
        ? ['ws', 'wf2', 'fr'] // web search, fetch, read file
        : []

    return {
      score,
      signals: signals.filter(s => s.weight > 0),
      severity,
      recommendation: this.generateRecommendation(score, severity, signals),
      shouldGroundWithTools: severity === 'high' || severity === 'critical',
      suggestedTools,
    }
  }

  /**
   * Extract likely factual claims
   */
  private extractFactClaims(text: string): string[] {
    const claims: string[] = []

    // Patterns that indicate factual claims
    const patterns = [
      /The [a-z\w]+ (is|was|are|were) [^.!?]+/gi,
      /[A-Z][a-z]+ (function|method|class|variable) (is|does) [^.!?]+/gi,
      /\d+ (% percentage|users|version|year) [^.!?]+/gi,
    ]

    patterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) claims.push(...matches)
    })

    return claims.slice(0, 5) // Limit to first 5
  }

  /**
   * Describe what each signal type means
   */
  private describeSignal(
    type: HallucinationSignal['type'],
  ): string {
    const descriptions: Record<HallucinationSignal['type'], string> = {
      'confidence-without-source': 'Strong confidence claims without data source',
      'fake-citation': 'Citation format that appears fabricated',
      'invented-api': 'API or method that may not exist',
      'uncertain-knowledge': 'Hedging language indicating uncertainty',
      'pattern-drift': 'Code pattern inconsistent with input',
      'fact-claim-without-grounding': 'Factual claims without grounding data',
    }
    return descriptions[type] || 'Unknown hallucination signal'
  }

  /**
   * Generate recommendation based on risk level
   */
  private generateRecommendation(
    score: number,
    severity: string,
    signals: HallucinationSignal[],
  ): string {
    if (severity === 'critical') {
      return 'CRITICAL: Use web search or fetch tools to verify claims before proceeding. Consider admitting uncertainty.'
    }
    if (severity === 'high') {
      return 'HIGH RISK: Ground claims with external data (web search, fetch, file read) before committing to plan.'
    }
    if (severity === 'medium') {
      return 'MEDIUM RISK: Double-check key assumptions. Use grounding tools if available for critical claims.'
    }
    return 'LOW RISK: Proceed with standard caution.'
  }

  /**
   * Format risk for logging
   */
  formatForLog(risk: HallucinationRisk): string {
    const signalSummary = risk.signals
      .slice(0, 3)
      .map(s => `  • ${s.type}: ${s.description}`)
      .join('\n')

    return `
⚠️ Hallucination Risk Analysis:
  Severity: ${risk.severity.toUpperCase()} (score: ${(risk.score * 100).toFixed(1)}%)
  Signals detected: ${risk.signals.length}
${signalSummary}
  Recommendation: ${risk.recommendation}
    `
  }
}
