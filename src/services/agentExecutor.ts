/**
 * Agent Executor: Executes plans autonomously without user intervention
 */

import chalk from 'chalk'
import type { PlanStep } from './pensieve.js'
import type { ToolRes } from '../types/index.js'
import { run as runTool } from '../tools/index.js'
import type { SessionCoordinator } from '../coordinator/session.js'

export interface ExecutionResult {
  step: PlanStep
  result: ToolRes
  success: boolean
  skipped: boolean
  error?: string
}

export interface ExecutionReport {
  totalSteps: number
  successfulSteps: number
  failedSteps: number
  skippedSteps: number
  results: ExecutionResult[]
  totalTime: number
}

export class AgentExecutor {
  private coord: SessionCoordinator
  private results: ExecutionResult[] = []
  private startTime: number = 0

  constructor(coord: SessionCoordinator) {
    this.coord = coord
  }

  /**
   * Execute a plan step by step
   */
  async executePlan(steps: PlanStep[]): Promise<ExecutionReport> {
    this.startTime = Date.now()
    this.results = []

    console.log(chalk.cyan('\n🚀 Executing Plan...\n'))

    for (const step of steps) {
      const result = await this.executeStep(step)
      this.results.push(result)

      if (result.skipped) {
        console.log(chalk.yellow(`  ⊘ Step ${step.order}: SKIPPED`))
      } else if (result.success) {
        console.log(chalk.green(`  ✓ Step ${step.order}: SUCCESS`))
        if (result.result.out) {
          console.log(chalk.dim(`    Output: ${result.result.out.substring(0, 100)}...`))
        }
      } else {
        console.log(chalk.red(`  ✗ Step ${step.order}: FAILED`))
        if (result.result.err) {
          console.log(chalk.red(`    Error: ${result.result.err}`))
        }

        // If step has skipIfFails and it failed, continue
        if (step.skipIfFails) {
          console.log(chalk.yellow(`    Continuing despite failure...`))
          continue
        }

        // Otherwise ask if we should continue
        console.log(chalk.yellow(`\n  Continue with remaining steps? (y/n)`))
        // In non-interactive mode, we continue
        continue
      }
    }

    const report = this.generateReport()

    console.log(chalk.cyan('\n📊 Execution Report:\n'))
    console.log(chalk.green(`  ✓ Successful: ${report.successfulSteps}/${report.totalSteps}`))
    console.log(chalk.red(`  ✗ Failed: ${report.failedSteps}/${report.totalSteps}`))
    console.log(chalk.yellow(`  ⊘ Skipped: ${report.skippedSteps}/${report.totalSteps}`))
    console.log(chalk.dim(`  ⏱ Total time: ${(report.totalTime / 1000).toFixed(2)}s\n`))

    return report
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: PlanStep): Promise<ExecutionResult> {
    try {
      // Log the action
      console.log(chalk.blue(`  ▶ Step ${step.order}: ${step.action}`))
      if (step.tool) {
        console.log(chalk.dim(`    Tool: ${step.tool}${step.args ? ` (${step.args.join(', ')})` : ''}`))
      }

      // If no tool specified, skip execution
      if (!step.tool) {
        return {
          step,
          result: { ok: true, out: 'No tool specified', err: '', ms: 0 },
          success: true,
          skipped: true,
        }
      }

      // Execute the tool
      const result = await runTool(step.tool, ...(step.args || []))

      // Record in session
      this.coord.recordTool(step.tool, result)

      return {
        step,
        result,
        success: result.ok,
        skipped: false,
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)

      return {
        step,
        result: { ok: false, out: '', err: error, ms: 0 },
        success: false,
        skipped: false,
        error,
      }
    }
  }

  /**
   * Generate execution report
   */
  private generateReport(): ExecutionReport {
    const totalTime = Date.now() - this.startTime
    const successfulSteps = this.results.filter(r => r.success && !r.skipped).length
    const failedSteps = this.results.filter(r => !r.success && !r.skipped).length
    const skippedSteps = this.results.filter(r => r.skipped).length

    return {
      totalSteps: this.results.length,
      successfulSteps,
      failedSteps,
      skippedSteps,
      results: this.results,
      totalTime,
    }
  }

  /**
   * Get the last result from a tool
   */
  getLastResult(toolName: string): ExecutionResult | undefined {
    return this.results.find(r => r.step.tool === toolName)
  }

  /**
   * Get all results
   */
  getResults(): ExecutionResult[] {
    return this.results
  }
}
