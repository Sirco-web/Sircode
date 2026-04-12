/**
 * AskUserTool - Let AI ask clarifying questions during execution
 * Format: [ask: question]
 */

export interface AskUserResult {
  action: 'ask_user'
  question: string
  answer?: string
}

export async function askUser(question: string): Promise<AskUserResult> {
  // This will be handled by the CLI's prompt system
  return {
    action: 'ask_user',
    question,
  }
}
