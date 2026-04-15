/**
 * Advanced Frustration & Emotion Handler
 * Detects user frustration and applies de-escalation strategies
 * Inspired by Claude's emotional intelligence layer
 */

export interface EmotionalAnalysis {
  frustrated: boolean
  frustrationLevel: 'low' | 'medium' | 'high' | 'severe'
  signals: EmotionSignal[]
  emotionalState: 'confident' | 'confused' | 'frustrated' | 'angry' | 'neutral'
  deescalationStrategy: string
  respondingTone: 'professional' | 'empathetic' | 'calm' | 'encouraging'
  suggestedActions: string[]
}

export interface EmotionSignal {
  type: string
  keyword: string
  intensity: 0.1 | 0.3 | 0.5 | 0.7 | 0.9
}

export class AdvancedFrustrationHandler {
  private frustrationPatterns: Array<{
    pattern: RegExp
    level: 'low' | 'medium' | 'high' | 'severe'
    emotionalState: string
    intensity: 0.1 | 0.3 | 0.5 | 0.7 | 0.9
  }> = [
    // SEVERE PATTERNS
    {
      pattern: /(!{2,}|can't take this|kill me|throw|crash|die)/gi,
      level: 'severe',
      emotionalState: 'angry',
      intensity: 0.9,
    },
    {
      pattern: /(fuck|shit|damn it|goddamn|wtf|wtf)/gi,
      level: 'severe',
      emotionalState: 'angry',
      intensity: 0.9,
    },
    {
      pattern: /(completely broken|absolute[ly]* disaster|waste.*time|useless)/gi,
      level: 'severe',
      emotionalState: 'angry',
      intensity: 0.9,
    },

    // HIGH PATTERNS
    {
      pattern: /(why.*work|not working|broken|stuck|failed)/gi,
      level: 'high',
      emotionalState: 'frustrated',
      intensity: 0.7,
    },
    {
      pattern: /(can't figure out|completely lost|no idea|confused)/gi,
      level: 'high',
      emotionalState: 'confused',
      intensity: 0.7,
    },
    {
      pattern: /(error[s]?|bug|issue|problem)/gi,
      level: 'medium',
      emotionalState: 'frustrated',
      intensity: 0.5,
    },

    // MEDIUM PATTERNS
    {
      pattern: /(having trouble|not sure|maybe|seems off)/gi,
      level: 'medium',
      emotionalState: 'confused',
      intensity: 0.3,
    },
    {
      pattern: /(again[?!]|still|repeat|same issue)/gi,
      level: 'medium',
      emotionalState: 'frustrated',
      intensity: 0.5,
    },

    // LOW PATTERNS
    {
      pattern: /(help|question|curious|wondering)/gi,
      level: 'low',
      emotionalState: 'neutral',
      intensity: 0.1,
    },
  ]

  private deescalationStrategies: Record<string, string> = {
    severe:
      'Acknowledge the severity, validate frustration, offer immediate help, ask for specifics',
    high: 'Acknowledge frustration, offer concrete next steps, show empathy, suggest tools or solutions',
    medium: 'Provide helpful information, offer multiple options, maintain calm tone',
    low: 'Professional, helpful response with clear guidance',
  }

  private toneAdjustments: Record<string, string> = {
    angry: 'calm, non-defensive, validating',
    frustrated: 'supportive, solution-focused, clear',
    confused: 'clear explanations, step-by-step guidance, patient',
    confident: 'collaborative, expert perspective, detailed',
    neutral: 'professional, informative, direct',
  }

  /**
   * Analyze user message for emotional signals
   */
  analyze(message: string): EmotionalAnalysis {
    const signals: EmotionSignal[] = []
    let maxLevel: 'low' | 'medium' | 'high' | 'severe' = 'low'
    let dominantState = 'neutral'

    // Check all patterns
    this.frustrationPatterns.forEach(({ pattern, level, emotionalState, intensity }) => {
      const matches = message.match(pattern)
      if (matches) {
        matches.forEach(keyword => {
          signals.push({ type: level, keyword, intensity })
        })

        // Update max level
        const levelOrder = { low: 0, medium: 1, high: 2, severe: 3 }
        if (levelOrder[level] > levelOrder[maxLevel]) {
          maxLevel = level
          dominantState = emotionalState
        }
      }
    })

    const frustrated = maxLevel !== 'low'
    const strategy = this.deescalationStrategies[maxLevel] || this.deescalationStrategies.low
    const tone = this.selectTone(dominantState, maxLevel)
    const actions = this.generateActions(maxLevel, dominantState)

    return {
      frustrated,
      frustrationLevel: maxLevel,
      signals: [...new Map(signals.map(s => [s.keyword, s])).values()].slice(0, 5),
      emotionalState: dominantState as any,
      deescalationStrategy: strategy,
      respondingTone: tone,
      suggestedActions: actions,
    }
  }

  /**
   * Select appropriate responding tone
   */
  private selectTone(
    emotionalState: string,
    level: string,
  ): 'professional' | 'empathetic' | 'calm' | 'encouraging' {
    if (level === 'severe') return 'calm'
    if (level === 'high') return 'empathetic'
    if (emotionalState === 'confused') return 'encouraging'
    return 'professional'
  }

  /**
   * Generate suggested de-escalation actions
   */
  private generateActions(level: string, state: string): string[] {
    const actions: Record<string, string[]> = {
      severe: [
        'Start with validation: "I understand this is frustrating"',
        'Offer immediate help: "Let me help you fix this"',
        'Break into small steps',
        'Ask for specific error messages or context',
        'Offer alternative approaches',
      ],
      high: [
        'Acknowledge the issue directly',
        'Offer multiple solution paths',
        'Use clear, short explanations',
        'Ask clarifying questions',
        'Provide step-by-step guidance',
      ],
      medium: [
        'Provide context and explanation',
        'Offer tools or resources',
        'Validate the user concern',
        'Suggest troubleshooting steps',
      ],
      low: ['Respond professionally', 'Provide helpful info', 'Offer guidance'],
    }

    return actions[level] || actions.low
  }

  /**
   * Generate de-escalation response template
   */
  generateResponseTemplate(analysis: EmotionalAnalysis): string {
    const templates: Record<string, string> = {
      severe: `I hear you — this is really frustrating. Let me help you fix this step by step.

**What I can do:**
1. Get the exact error/issue details from you
2. Break down the solution into concrete steps
3. Solve this together

**What I need:**
- Specific error message
- What you were trying to do
- What happened instead

Let's tackle this.`,

      high: `I understand that's frustrating. Let me help you work through this.

**Here's what I suggest:**
1. [Specific action]
2. [Next step]
3. [Verification]

**If that doesn't work, we can try:**
- [Alternative 1]
- [Alternative 2]

What specific part would you like to focus on first?`,

      medium: `Here are some options to try:

**Approach 1:** [Clear explanation]
**Approach 2:** [Alternative]

I'd suggest starting with Approach 1. Let me know how it goes.`,

      low: `Here's how to approach this:

[Clear, structured response]

Let me know if you have questions.`,
    }

    return templates[analysis.frustrationLevel] || templates.low
  }

  /**
   * Format analysis for logging
   */
  formatForLog(analysis: EmotionalAnalysis): string {
    if (analysis.frustrationLevel === 'low' && !analysis.frustrated) {
      return '👍 User: Neutral emotional state'
    }

    const signalSummary = analysis.signals
      .slice(0, 3)
      .map(s => `  • "${s.keyword}" (intensity: ${Math.round(s.intensity * 100)}%)`)
      .join('\n')

    const warning =
      analysis.frustrationLevel === 'severe'
        ? '🔴'
        : analysis.frustrationLevel === 'high'
          ? '🟠'
          : '🟡'

    return `
${warning} Emotional Analysis:
  Level: ${analysis.frustrationLevel.toUpperCase()}
  State: ${analysis.emotionalState}
  Tone to use: ${analysis.respondingTone}
  
  Signals:
${signalSummary}

  Strategy: ${analysis.deescalationStrategy}

  Suggested Actions:
${analysis.suggestedActions.map(a => `    • ${a}`).join('\n')}
    `
  }

  /**
   * Check if immediate human escalation is recommended
   */
  shouldEscalate(analysis: EmotionalAnalysis): boolean {
    return analysis.frustrationLevel === 'severe' || analysis.signals.length > 5
  }

  /**
   * Generate supportive opening based on analysis
   */
  generateOpening(analysis: EmotionalAnalysis): string {
    const openings: Record<string, string[]> = {
      severe: [
        "I can see you're really frustrated right now, and I want to help.",
        "This is clearly a painful situation — let's fix it step by step.",
        "I hear the frustration. Let's tackle this together.",
      ],
      high: [
        "I understand that's frustrating. Let me help.",
        "I can see why this would be annoying. Here's what we can do:",
        "Let's work through this together.",
      ],
      medium: [
        "I can help with that.",
        "Here are some things to try:",
        "Let me break this down for you:",
      ],
      low: [
        "Great question. Here's how:",
        "I can help with that.",
        "Good thinking. Here's the answer:",
      ],
    }

    const options = openings[analysis.frustrationLevel] || openings.low
    return options[Math.floor(Math.random() * options.length)]
  }
}
