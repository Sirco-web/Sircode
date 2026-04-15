/**
 * Pensieve: Internal thinking and planning service
 * Allows the agent to think and plan without showing intermediate steps to the user
 * Similar to Claude's extended thinking mode
 */

import type { Msg } from '../types/index.js'
import type { Ollama } from './ollama.js'

export interface ThinkingResult {
  thinking: string
  plan: PlanStep[]
  estimatedSteps: number
  reasoning: string
}

export interface PlanStep {
  order: number
  action: string
  tool?: string
  args?: string[]
  rationale: string
  skipIfFails?: boolean
}

export class Pensieve {
  private ollama: Ollama
  private maxThinkingTokens = 16000

  constructor(ollama: Ollama) {
    this.ollama = ollama
  }

  /**
   * Enter pensieve mode and generate a plan for the given request
   * This happens silently without user seeing intermediate thinking
   */
  async think(userRequest: string, context: Msg[] = []): Promise<ThinkingResult> {
    const systemPrompt = `You are an expert AI assistant that thinks deeply before acting. 
Your task is to analyze the user's request and create a detailed action plan.

IMPORTANT: You MUST output your response in the following JSON format ONLY:
{
  "thinking": "Your detailed internal thoughts and analysis (max 1000 words)",
  "plan": [
    {
      "order": 1,
      "action": "What to do",
      "tool": "tool_name or null",
      "args": ["arg1", "arg2"] or null,
      "rationale": "Why this step",
      "skipIfFails": false
    }
  ],
  "estimatedSteps": <number>,
  "reasoning": "Overall reasoning for the plan"
}

Available tools:
- bash: Run shell commands
- rf/fr: Read files
- fe/wf: Write/edit files
- mkdir: Create directories
- rmf: Remove files
- git: Git operations
- ws: Web search
- tc/tl/tu/tc2: Task management

When creating a plan:
1. Break down the request into concrete steps
2. Identify which tools are needed
3. Handle errors gracefully (use skipIfFails where appropriate)
4. Consider dependencies between steps
5. Think about edge cases`

    const messages: Msg[] = [
      ...context,
      {
        role: 'user',
        content: `Please analyze this request and create a detailed action plan:\n\n${userRequest}`,
      },
    ]

    try {
      const response = await this.ollama.chat(messages, {
        predict: this.maxThinkingTokens,
      })

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse thinking response as JSON')
      }

      const result = JSON.parse(jsonMatch[0]) as ThinkingResult
      return result
    } catch (e) {
      throw new Error(`Pensieve thinking failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  /**
   * Quick validation of a plan before execution
   */
  validatePlan(plan: PlanStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!Array.isArray(plan) || plan.length === 0) {
      errors.push('Plan must have at least one step')
    }

    const orderNumbers = plan.map(s => s.order)
    const duplicates = orderNumbers.filter((v, i) => orderNumbers.indexOf(v) !== i)
    if (duplicates.length > 0) {
      errors.push(`Duplicate order numbers found: ${duplicates.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Format thinking result for logging/debugging
   */
  formatForLog(result: ThinkingResult): string {
    const planSummary = result.plan
      .map(s => `${s.order}. ${s.action}${s.tool ? ` [${s.tool}]` : ''}`)
      .join('\n  ')

    return `
📖 Pensieve Analysis:
  Thinking: ${result.thinking.substring(0, 100)}...
  Plan Steps: ${result.plan.length}
  ${planSummary}
  Reasoning: ${result.reasoning}
    `
  }
}
