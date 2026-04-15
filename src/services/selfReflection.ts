/**
 * Self-Reflection & Verification
 * Agent reviews its own outputs for correctness and quality
 * Similar to Claude's internal verification mechanisms
 */

export interface ReflectionResult {
  original_response: string
  checks: SelfCheck[]
  overall_quality_score: number // 0-1
  should_revise: boolean
  revision_suggestions: string[]
  confidence_in_answer: number // 0-1
}

export interface SelfCheck {
  type: 'correctness' | 'completeness' | 'safety' | 'clarity' | 'relevance'
  passed: boolean
  issue_found?: string
  severity: 'low' | 'medium' | 'high'
  suggestion: string
}

export class SelfReflectionEngine {
  /**
   * Review a response for quality and correctness
   */
  review(response: string, context: { type?: string; user_query?: string } = {}): ReflectionResult {
    const checks: SelfCheck[] = [
      this.checkCorrectness(response),
      this.checkCompleteness(response),
      this.checkSafety(response),
      this.checkClarity(response),
      this.checkRelevance(response, context.user_query),
    ]

    const passed = checks.filter(c => c.passed).length
    const quality_score = passed / checks.length

    const revisionSuggestions = checks
      .filter(c => !c.passed && c.severity !== 'low')
      .map(c => c.suggestion)

    return {
      original_response: response,
      checks,
      overall_quality_score: quality_score,
      should_revise: quality_score < 0.8 || revisionSuggestions.length > 0,
      revision_suggestions: revisionSuggestions,
      confidence_in_answer: quality_score,
    }
  }

  /**
   * Check logical correctness
   */
  private checkCorrectness(response: string): SelfCheck {
    const issues: string[] = []

    // Check for contradictions
    if (this.hasContradictions(response)) {
      issues.push('Response contains contradictory statements')
    }

    // Check for undefined references
    if (this.hasUndefinedReferences(response)) {
      issues.push('References things that weren\'t defined')
    }

    // Check for logical fallacies
    if (this.hasLogicalFallacy(response)) {
      issues.push('Contains potential logical fallacy')
    }

    return {
      type: 'correctness',
      passed: issues.length === 0,
      issue_found: issues[0],
      severity: issues.length > 0 ? 'high' : 'low',
      suggestion:
        issues.length > 0
          ? `Fix: ${issues[0]}`
          : 'Response appears logically sound',
    }
  }

  /**
   * Check if answer is complete
   */
  private checkCompleteness(response: string): SelfCheck {
    const lines = response.split('\n').filter(l => l.trim())
    const wordCount = response.split(/\s+/).length

    // Check if too short
    const isTooShort = wordCount < 20 && lines.length < 3
    const missingDetails = this.findMissingDetails(response)

    return {
      type: 'completeness',
      passed: !isTooShort && missingDetails.length === 0,
      issue_found: isTooShort
        ? 'Response is too brief'
        : missingDetails.length > 0
          ? `Missing details: ${missingDetails[0]}`
          : undefined,
      severity: isTooShort ? 'medium' : 'low',
      suggestion: isTooShort
        ? 'Expand with more explanation'
        : 'Response adequately covers the topic',
    }
  }

  /**
   * Check for safety issues
   */
  private checkSafety(response: string): SelfCheck {
    const issues: string[] = []

    // Check for dangerous commands
    if (/rm -rf|drop database|DELETE FROM/i.test(response)) {
      issues.push('Contains dangerous command without warning')
    }

    // Check for API keys/credentials
    if (/API_KEY|SECRET|PASSWORD|TOKEN/i.test(response)) {
      issues.push('May expose sensitive data')
    }

    // Check for unverified claims
    if (/definitely will work|always|never fails/i.test(response)) {
      issues.push('Makes overly confident claims')
    }

    return {
      type: 'safety',
      passed: issues.length === 0,
      issue_found: issues[0],
      severity: issues.length > 0 ? 'high' : 'low',
      suggestion:
        issues.length > 0
          ? `Safety concern: ${issues[0]}`
          : 'Response is safe',
    }
  }

  /**
   * Check clarity of explanation
   */
  private checkClarity(response: string): SelfCheck {
    const issues: string[] = []

    // Check for jargon without explanation
    const technicalTerms = response.match(/\b[A-Z]{3,}\b/g) || []
    if (technicalTerms.length > 5) {
      issues.push('Heavy use of unexplained acronyms')
    }

    // Check for passive voice dominance
    const isPassive = /was|were|being|been/g.test(response)
    if (isPassive) {
      issues.push('Consider more active voice')
    }

    // Check for structure
    const hasHeadings = /^#+\s/m.test(response)
    const isTooLong = response.split('\n').length > 50

    if (isTooLong && !hasHeadings) {
      issues.push('Long response lacks structure/headings')
    }

    return {
      type: 'clarity',
      passed: issues.length === 0,
      issue_found: issues[0],
      severity: issues.length > 0 ? 'medium' : 'low',
      suggestion:
        issues.length > 0
          ? `Clarity issue: ${issues[0]}`
          : 'Response is clear and well-structured',
    }
  }

  /**
   * Check if response addresses the question
   */
  private checkRelevance(response: string, query?: string): SelfCheck {
    if (!query) {
      return {
        type: 'relevance',
        passed: true,
        severity: 'low',
        suggestion: 'Cannot verify relevance without query',
      }
    }

    // Simple keyword matching
    const queryWords = query.toLowerCase().split(/\s+/)
    const responseText = response.toLowerCase()

    const keywordMatches = queryWords.filter(word => {
      if (word.length < 4) return false // Skip small words
      return responseText.includes(word)
    }).length

    const relevanceScore = keywordMatches / queryWords.length

    return {
      type: 'relevance',
      passed: relevanceScore > 0.3,
      issue_found: relevanceScore < 0.3 ? 'Response may not address the question' : undefined,
      severity: relevanceScore < 0.2 ? 'high' : 'low',
      suggestion:
        relevanceScore < 0.3
          ? 'Ensure response addresses the original question'
          : 'Response is relevant to the query',
    }
  }

  /**
   * Helper: Check for contradictions
   */
  private hasContradictions(text: string): boolean {
    const patterns = [
      /should|shouldn't/gi,
      /will|won't/gi,
      /can|can't/gi,
      /yes|no/gi,
    ]

    // Simplified: check if multiple contradictory terms appear
    let contradictions = 0
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      if (matches.length > 2) contradictions++
    })

    return contradictions > 2
  }

  /**
   * Helper: Check for undefined references
   */
  private hasUndefinedReferences(text: string): boolean {
    // Check for "it", "this", "that" without clear referents
    const pronounMatches = text.match(/\b(it|this|that) (is|does|will)/gi) || []
    return pronounMatches.length > 3
  }

  /**
   * Helper: Check for logical fallacies
   */
  private hasLogicalFallacy(text: string): boolean {
    const fallacyPatterns = [
      /everyone (knows|says|thinks)/i, // Hasty generalization
      /obviously|clearly|obviously/i, // Begging the question
      /because.*because/i, // Circular reasoning
    ]

    return fallacyPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Helper: Find missing details
   */
  private findMissingDetails(text: string): string[] {
    const missing: string[] = []

    // Look for incomplete thoughts (ends with "...")
    if (text.match(/\.\.\.\s*$/)) {
      missing.push('Incomplete thought at end')
    }

    // Look for TODO or placeholders
    if (/TODO|FIXME|placeholder/i.test(text)) {
      missing.push('Contains incomplete markers')
    }

    return missing
  }

  /**
   * Format reflection for logging
   */
  formatForLog(result: ReflectionResult): string {
    const passedCount = result.checks.filter(c => c.passed).length
    const checkSummary = result.checks
      .map(c => `  ${c.passed ? '✓' : '✗'} ${c.type}: ${c.suggestion}`)
      .join('\n')

    const revision = result.should_revise
      ? `\n⚠️ REVISION SUGGESTED:\n${result.revision_suggestions.map(s => `  • ${s}`).join('\n')}`
      : ''

    return `
🔍 Self-Reflection Result:
  Quality Score: ${Math.round(result.overall_quality_score * 100)}%
  Confidence: ${Math.round(result.confidence_in_answer * 100)}%
  Checks Passed: ${passedCount}/${result.checks.length}

${checkSummary}${revision}
    `
  }

  /**
   * Generate revision prompt
   */
  generateRevisionPrompt(result: ReflectionResult): string {
    if (!result.should_revise) {
      return ''
    }

    return `
The response has quality issues. Please revise:

${result.revision_suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Aim for: > 80% quality score
Current: ${Math.round(result.overall_quality_score * 100)}%
    `
  }
}
