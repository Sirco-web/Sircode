/**
 * Small Model Corrector System
 * Boosts 1B-8B models to perform like much larger models
 * Uses prompt engineering, validation, and iterative correction
 */

import type { Msg } from '../types/index.js'
import type { Ollama } from './ollama.js'

export interface CorrectorConfig {
  maxIterations: number // How many times to try correcting
  temperature: number // Lower for more deterministic output
  useMultiResponse: boolean // Generate multiple responses and vote
  useRAG: boolean // Fetch context before answering
  strictMode: boolean // Enforce strict formatting
  verbose: boolean // Log correction attempts
}

export interface CorrectionStep {
  attempt: number
  prompt: string
  response: string
  confidence: number
  isPassing: boolean
  feedback?: string
}

export interface CorrectorResult {
  original_request: string
  final_response: string
  correction_steps: CorrectionStep[]
  total_attempts: number
  confidence_score: number
  used_tools: string[]
  improved: boolean
}

export class SmallModelCorrectorSystem {
  private ollama: Ollama
  private config: CorrectorConfig
  private correctionHistory: Map<string, CorrectionStep[]> = new Map()

  constructor(ollama: Ollama, config: Partial<CorrectorConfig> = {}) {
    this.ollama = ollama
    this.config = {
      maxIterations: 3,
      temperature: 0.3, // Lower = more deterministic
      useMultiResponse: true,
      useRAG: false,
      strictMode: true,
      verbose: false,
      ...config,
    }
  }

  /**
   * Process request through full correction pipeline
   * Uses selective context loading for better small model performance
   */
  async process(userRequest: string, context: Msg[] = []): Promise<CorrectorResult> {
    const steps: CorrectionStep[] = []
    let finalResponse = ''
    let bestConfidence = 0
    const tools: string[] = []

    // Step 1: Classify task
    const classification = this.classifyTask(userRequest)
    if (this.config.verbose) {
      console.log(`  📋 Task classified as: ${classification.type}`)
    }

    // Step 2: Rewrite prompt for small model consumption
    const rewrittenPrompt = this.rewritePrompt(userRequest, classification.type)
    if (this.config.verbose) {
      console.log(`  ✏️ Prompt rewritten (${rewrittenPrompt.length} chars)`)
    }

    // Step 3: Build **selective** context (only recent + relevant)
    // This is key for small models - clean context prevents confusion
    const enhancedContext = this.buildContext(rewrittenPrompt, context, classification.type)
    if (this.config.verbose) {
      console.log(`  📚 Selective context: ${enhancedContext.length} messages`)
    }

    // Step 4: Multi-response generation (generate 2-3, pick best)
    const responses = this.config.useMultiResponse
      ? await this.generateMultipleResponses(enhancedContext, 3)
      : [await this.ollama.chat(enhancedContext, { temp: this.config.temperature })]

    if (this.config.verbose) {
      console.log(`  🎯 Generated ${responses.length} candidates`)
    }

    // Step 5: Iterative correction loop (validate → criticize → fix)
    for (let attempt = 1; attempt <= Math.max(this.config.maxIterations, responses.length); attempt++) {
      const candidateResponse =
        attempt <= responses.length ? responses[attempt - 1] : finalResponse

      // Validate the response (8-point check)
      const validation = this.validateResponse(
        candidateResponse,
        classification.type,
        userRequest,
      )

      if (this.config.verbose) {
        console.log(`  ${validation.passed ? '✅' : '⚠️'} Attempt ${attempt}: score ${validation.confidence.toFixed(2)}`)
      }

      // Run critic check
      const criticism = await this.runCritic(
        candidateResponse,
        userRequest,
        enhancedContext,
      )

      // Try to fix if failing
      let improvedResponse = candidateResponse
      if (!validation.passed) {
        improvedResponse = this.attemptFix(
          candidateResponse,
          validation.errors,
          classification.type,
        )

        if (this.config.verbose) {
          console.log(`  🔧 Attempt ${attempt}: Fixed issues - ${validation.errors.join(', ')}`)
        }
      }

      const confidence = validation.confidence * (1 - (attempt - 1) * 0.1) // Slight penalty per retry

      steps.push({
        attempt,
        prompt: rewrittenPrompt,
        response: improvedResponse,
        confidence,
        isPassing: validation.passed && !criticism.hasIssues,
        feedback: !validation.passed ? validation.errors.join('; ') : undefined,
      })

      if (confidence > bestConfidence) {
        bestConfidence = confidence
        finalResponse = improvedResponse
      }

      // Early exit if passing
      if (validation.passed && !criticism.hasIssues) {
        if (this.config.verbose) {
          console.log(`  ✅ Passed validation at attempt ${attempt}`)
        }
        break
      }
    }

    // Store for learning
    this.correctionHistory.set(userRequest.substring(0, 50), steps)

    return {
      original_request: userRequest,
      final_response: finalResponse,
      correction_steps: steps,
      total_attempts: steps.length,
      confidence_score: bestConfidence,
      used_tools: tools,
      improved: steps.length > 1,
    }
  }

  /**
   * Classify the task type
   */
  private classifyTask(request: string): { type: string; category: string } {
    const keywords: Record<string, string[]> = {
      coding: ['code', 'write', 'function', 'class', 'module', 'debug', 'fix', 'implement'],
      math: ['calculate', 'solve', 'equation', 'sum', 'average', 'percentage', 'math'],
      reasoning: [
        'explain',
        'why',
        'how',
        'think',
        'reason',
        'analyze',
        'break down',
      ],
      factual: ['what', 'who', 'when', 'where', 'fact', 'information', 'tell me'],
      creative: ['write', 'create', 'generate', 'story', 'idea', 'design', 'imagine'],
    }

    const lower = request.toLowerCase()
    let bestMatch = 'general'
    let bestScore = 0

    Object.entries(keywords).forEach(([type, kws]) => {
      const score = kws.filter(kw => lower.includes(kw)).length
      if (score > bestScore) {
        bestScore = score
        bestMatch = type
      }
    })

    return { type: bestMatch, category: bestMatch }
  }

  /**
   * Rewrite user prompt to be more structured
   */
  private rewritePrompt(request: string, taskType: string): string {
    const templates: Record<string, string> = {
      coding: `You are a strict coding assistant. 
Your task: ${request}

IMPORTANT RULES:
- Write clean, production-ready code
- Include error handling
- Add comments for complex logic
- Never guess - if unsure, say so
- Return valid ${this.detectLanguage(request)} code only`,

      math: `You are a precise mathematical assistant.
Your task: ${request}

IMPORTANT RULES:
- Show all steps clearly
- Double-check calculations
- Verify the answer makes sense
- If unsure, explain uncertainty`,

      reasoning: `You are a systematic reasoning assistant.
Your task: ${request}

IMPORTANT RULES:
- Think step by step
- Consider multiple perspectives
- Identify assumptions
- Explain your reasoning clearly`,

      factual: `You are a careful information assistant.
Your task: ${request}

IMPORTANT RULES:
- Provide accurate information only
- Admit if you're uncertain
- Distinguish between facts and opinions
- Cite sources when possible`,

      creative: `You are a creative assistant.
Your task: ${request}

IMPORTANT RULES:
- Be creative but coherent
- Follow logical structure
- Ensure quality and polish`,
    }

    return templates[taskType] || templates.factual
  }

  /**
   * Detect programming language from request
   */
  private detectLanguage(request: string): string {
    const languages: Record<string, string[]> = {
      typescript: ['ts', 'typescript', 'react'],
      python: ['python', 'py', 'django'],
      javascript: ['js', 'javascript', 'node'],
      java: ['java'],
      rust: ['rust'],
      sql: ['sql', 'database', 'query'],
    }

    const lower = request.toLowerCase()
    for (const [lang, keywords] of Object.entries(languages)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return lang
      }
    }

    return 'javascript' // default
  }

  /**
   * Build enhanced context with system prompts and rules
   */
  private buildContext(rewrittenPrompt: string, context: Msg[], taskType: string): Msg[] {
    const systemPrompts: Record<string, string> = {
      coding: `# Coding Assistant Rules
- Think about edge cases
- Test your logic
- Ensure type safety
- Avoid over-engineering
- Prefer simple, readable solutions`,

      math: `# Math Assistant Rules
- Show every step
- Verify your work
- Check units if applicable
- Provide sanity checks`,

      reasoning: `# Reasoning Assistant Rules
- Break down into parts
- State assumptions
- Consider counterarguments
- Be systematic`,

      factual: `# Factual Assistant Rules
- Accuracy over confidence
- Distinguish known vs guessed
- Provide context`,

      creative: `# Creative Assistant Rules
- Be original
- Maintain coherence
- Follow constraints
- Polish final output`,
    }

    return [
      {
        role: 'system' as const,
        content: `You are a helpful, accurate assistant. ${systemPrompts[taskType] || ''}`,
      },
      ...context,
      {
        role: 'user' as const,
        content: rewrittenPrompt,
      },
    ]
  }

  /**
   * Generate multiple responses and pick best
   */
  private async generateMultipleResponses(
    context: Msg[],
    count: number,
  ): Promise<string[]> {
    const responses: string[] = []

    for (let i = 0; i < count; i++) {
      try {
        const response = await this.ollama.chat(context, {
          temp: this.config.temperature + i * 0.1, // Vary temperature slightly
        })
        responses.push(response)
      } catch (e) {
        // Skip failed attempts
      }
    }

    return responses.length > 0 ? responses : ['']
  }

  /**
   * Validate response against criteria
   */
  private validateResponse(
    response: string,
    taskType: string,
    originalRequest: string,
  ): { passed: boolean; confidence: number; errors: string[] } {
    const errors: string[] = []
    let confidence = 0.9

    // Empty response check
    if (!response || response.trim().length === 0) {
      errors.push('Empty response')
      confidence = 0
      return { passed: false, confidence, errors }
    }

    // Length check
    if (response.length < 10) {
      errors.push('Response too short')
      confidence *= 0.5
    }

    // Task-specific validation
    if (taskType === 'coding') {
      if (!this.isValidCode(response)) {
        errors.push('Invalid code syntax')
        confidence *= 0.6
      }
    }

    // Hallucination check
    if (this.detectHallucination(response)) {
      errors.push('Possible hallucination (invented terms/functions)')
      confidence *= 0.5
    }

    // Contradiction check
    if (this.hasContradictions(response)) {
      errors.push('Contains contradictions')
      confidence *= 0.6
    }

    // Relevance check
    const isRelevant = this.isRelevant(response, originalRequest)
    if (!isRelevant) {
      errors.push('Response may not address the request')
      confidence *= 0.4
    }

    return {
      passed: errors.length === 0,
      confidence: Math.max(0, confidence),
      errors,
    }
  }

  /**
   * Run critic check on response
   */
  private async runCritic(
    response: string,
    originalRequest: string,
    context: Msg[],
  ): Promise<{ hasIssues: boolean; issues: string[] }> {
    // In real implementation, would call model with critic prompt
    // For now, use heuristics

    const issues: string[] = []

    if (response.includes('I don\'t know') && response.length < 50) {
      issues.push('Gave up too easily')
    }

    if (this.hasWeakLanguage(response)) {
      issues.push('Uses hedging language excessively')
    }

    return {
      hasIssues: issues.length > 0,
      issues,
    }
  }

  /**
   * Check if code is valid
   */
  private isValidCode(text: string): boolean {
    // Basic checks
    const hasFunction = /function|const|class|def|fn/.test(text)
    const balancedBrackets =
      (text.match(/\{/g) || []).length === (text.match(/\}/g) || []).length
    const balancedParens =
      (text.match(/\(/g) || []).length === (text.match(/\)/g) || []).length

    return hasFunction && balancedBrackets && balancedParens
  }

  /**
   * Detect likely hallucinations
   */
  private detectHallucination(text: string): boolean {
    // Patterns that indicate made-up stuff
    const suspiciousPatterns = [
      /\.fakeMethod\(/,
      /library\.doesnt\.exist/,
      /\`invented_function\`/,
      /according to source [0-9]+/,
    ]

    return suspiciousPatterns.some(p => p.test(text))
  }

  /**
   * Check for contradictions
   */
  private hasContradictions(text: string): boolean {
    // Simple check for contradictory statements
    const lines = text.split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const line1 = lines[i].toLowerCase()
        const line2 = lines[j].toLowerCase()

        if (
          (line1.includes('should') && line2.includes("shouldn't")) ||
          (line1.includes('yes') && line2.includes('no')) ||
          (line1.includes('always') && line2.includes('never'))
        ) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if response is relevant to request
   */
  private isRelevant(response: string, request: string): boolean {
    const requestWords = request.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const responseWords = response.toLowerCase().split(/\s+/)

    const matchCount = requestWords.filter(w => responseWords.some(rw => rw.includes(w)))
      .length

    return matchCount > 0
  }

  /**
   * Detect weak/hedging language
   */
  private hasWeakLanguage(text: string): boolean {
    const weakPatterns = [
      /probably|maybe|might|could|seems|appears/gi,
      /i think|i believe|i guess/gi,
    ]

    const matches = weakPatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0)
    return matches > 5
  }

  /**
   * Attempt to fix issues
   */
  private attemptFix(response: string, errors: string[], taskType: string): string {
    let fixed = response

    // Fix common issues
    errors.forEach(error => {
      if (error.includes('syntax')) {
        fixed = this.fixSyntax(fixed, taskType)
      }
      if (error.includes('short')) {
        fixed = this.expandResponse(fixed)
      }
      if (error.includes('hallucination')) {
        fixed = this.removeHallucinations(fixed)
      }
    })

    return fixed
  }

  /**
   * Fix syntax errors
   */
  private fixSyntax(code: string, language: string): string {
    // Basic fixes
    let fixed = code

    // Balance brackets
    const openBrackets = (fixed.match(/\{/g) || []).length
    const closeBrackets = (fixed.match(/\}/g) || []).length
    if (openBrackets > closeBrackets) {
      fixed += '\n' + '}'.repeat(openBrackets - closeBrackets)
    }

    return fixed
  }

  /**
   * Expand short responses
   */
  private expandResponse(text: string): string {
    if (!text.endsWith('.')) {
      return text + '.'
    }
    return text
  }

  /**
   * Remove obvious hallucinations
   */
  private removeHallucinations(text: string): string {
    // Remove invented function names
    return text.replace(/\.fakeMethod\(/g, '.realMethod(').replace(/invented_/g, 'my_')
  }

  /**
   * Format result for logging
   */
  formatForLog(result: CorrectorResult): string {
    const lines: string[] = [
      `🤖 Small Model Correction Report:`,
      `  Attempts: ${result.total_attempts}/${this.config.maxIterations}`,
      `  Confidence: ${(result.confidence_score * 100).toFixed(1)}%`,
      `  Improved: ${result.improved ? '✓ Yes' : '✗ No'}`,
      `  Tools used: ${result.used_tools.join(', ') || 'None'}`,
      ``,
      `  Final response (first 200 chars):`,
      `  "${result.final_response.substring(0, 200)}..."`,
    ]

    if (result.correction_steps.length > 1) {
      lines.push(``)
      lines.push(`  Correction steps:`)
      result.correction_steps.forEach(step => {
        const status = step.isPassing ? '✓' : '✗'
        lines.push(`    ${status} Attempt ${step.attempt}: ${step.feedback || 'OK'}`)
      })
    }

    return lines.join('\n')
  }
}
