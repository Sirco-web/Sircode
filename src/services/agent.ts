/**
 * Agent: Main autonomous agent with thinking and autonomous execution
 * Core of Sircode's autonomous mode
 */

import chalk from 'chalk'
import ora from 'ora'
import type { Msg, Ctx } from '../types/index.js'
import type { Ollama } from './ollama.js'
import type { ContextService } from './context.js'
import { Pensieve, type ThinkingResult } from './pensieve.js'
import { AgentExecutor, type ExecutionReport } from './agentExecutor.js'
import { SkillRegistry } from './skillRegistry.js'
import type { SessionCoordinator } from '../coordinator/session.js'

export interface AgentResponse {
  thinking: ThinkingResult
  execution: ExecutionReport
  summary: string
  autoExecuted: boolean
}

export class Agent {
  private ollama: Ollama
  private context: ContextService
  private coord: SessionCoordinator
  private pensieve: Pensieve
  private executor: AgentExecutor
  private skillRegistry: SkillRegistry

  constructor(
    ollama: Ollama,
    context: ContextService,
    coord: SessionCoordinator,
  ) {
    this.ollama = ollama
    this.context = context
    this.coord = coord
    this.pensieve = new Pensieve(ollama)
    this.executor = new AgentExecutor(coord)
    this.skillRegistry = new SkillRegistry()
  }

  /**
   * Main entry point: Process user request with autonomous thinking and execution
   * Returns immediately after starting autonomous execution
   */
  async processRequest(userRequest: string): Promise<AgentResponse> {
    console.log(chalk.dim('Analyzing request...'))

    // Add user request to context
    this.context.add('user', userRequest)

    // Step 1: PENSIEVE MODE - Think and plan (silent, with spinner)
    const spinner = ora({
      text: chalk.cyan('Thinking and planning...'),
      prefixText: chalk.cyan('📖'),
    }).start()

    let thinkingResult: ThinkingResult
    try {
      thinkingResult = await this.pensieve.think(userRequest, this.context.forAPI())
      spinner.succeed(chalk.green(`Planning complete (${thinkingResult.plan.length} steps)`))
    } catch (e) {
      spinner.fail(chalk.red(`Thinking failed: ${e instanceof Error ? e.message : String(e)}`))
      throw e
    }

    // Validate plan
    const validation = this.pensieve.validatePlan(thinkingResult.plan)
    if (!validation.valid) {
      console.log(chalk.red('\n✗ Plan validation failed:'))
      validation.errors.forEach(err => console.log(chalk.red(`  - ${err}`)))
      throw new Error('Invalid plan generated')
    }

    // Show thinking analysis (optional, for debugging)
    if (process.env.DEBUG_THINKING) {
      console.log(this.pensieve.formatForLog(thinkingResult))
    }

    // Step 2: Display plan to user
    console.log(chalk.blue('\n📋 Execution Plan:'))
    thinkingResult.plan.forEach(step => {
      console.log(chalk.dim(`  ${step.order}. ${step.action}`))
      if (step.tool) {
        console.log(chalk.dim(`     [${step.tool}] ${step.rationale}`))
      }
    })

    console.log(chalk.yellow(`\n💭 Reasoning: ${thinkingResult.reasoning}\n`))

    // Step 3: AUTO-EXECUTE the plan (no user confirmation needed)
    console.log(chalk.blue('Starting autonomous execution...\n'))

    const execution = await this.executor.executePlan(thinkingResult.plan)

    // Record the insight
    this.coord.recordInsight(`Agent executed ${execution.successfulSteps}/${execution.totalSteps} steps successfully`)

    // Add assistant response to context for future reference
    const summary = this.generateSummary(thinkingResult, execution)
    this.context.add('assistant', summary)

    return {
      thinking: thinkingResult,
      execution,
      summary,
      autoExecuted: true,
    }
  }

  /**
   * Get available skills
   */
  getAvailableSkills() {
    return this.skillRegistry.getAllSkills()
  }

  /**
   * Enable a skill
   */
  enableSkill(skillName: string): boolean {
    return this.skillRegistry.enableSkill(skillName)
  }

  /**
   * Disable a skill
   */
  disableSkill(skillName: string): boolean {
    return this.skillRegistry.disableSkill(skillName)
  }

  /**
   * Generate summary of execution
   */
  private generateSummary(thinking: ThinkingResult, execution: ExecutionReport): string {
    const lines: string[] = [
      '## Autonomous Execution Summary\n',
      `**Planning Phase:** ${thinking.plan.length} steps identified`,
      `**Execution Results:**`,
      `- Successful: ${execution.successfulSteps}/${execution.totalSteps}`,
      `- Failed: ${execution.failedSteps}/${execution.totalSteps}`,
      `- Skipped: ${execution.skippedSteps}/${execution.totalSteps}`,
      `- Duration: ${(execution.totalTime / 1000).toFixed(2)}s`,
      `\n**Reasoning:** ${thinking.reasoning}`,
    ]

    return lines.join('\n')
  }

  /**
   * Format context for AI (includes skills and instructions)
   */
  formatContext(): string {
    const skillsInfo = this.skillRegistry.formatForContext()
    const systemPrompt = `You are Sircode, an autonomous AI agent powered by Ollama.

${skillsInfo}

## Execution Mode
- You think before acting (internal planning phase)
- Once a plan is ready, you execute it autonomously
- No user confirmation is needed for execution
- Focus on efficiency and accuracy

## Instructions
1. When given a task, analyze it thoroughly
2. Break it down into concrete, executable steps
3. Use appropriate tools from available skills
4. Handle errors gracefully with skip-on-failure where appropriate
5. Always provide clear reasoning for your plan`

    return systemPrompt
  }
}
