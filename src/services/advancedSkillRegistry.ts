/**
 * Advanced Skill Taxonomy - Based on Claude's capability structure
 * Categorizes skills by cognitive domain, not just tool usage
 */

export interface AdvancedSkill {
  id: string
  name: string
  description: string
  category: SkillCategory
  subcategory: SkillSubcategory
  capabilityLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
  tools: string[]
  confidence: number // 0-1, how confident is the agent in using this
  hallucination_risk: number // 0-1, how likely to hallucinate with this
  requires_grounding: boolean // needs external data
  requires_tools: string[] // must have these tools available
  examples: string[]
}

export type SkillCategory = 
  | 'cognitive'
  | 'language'
  | 'technical'
  | 'creative'
  | 'social'
  | 'tool'

export type SkillSubcategory =
  // Cognitive
  | 'reasoning'
  | 'problem-solving'
  | 'pattern-recognition'
  | 'planning'
  | 'estimation'
  // Language
  | 'writing'
  | 'summarization'
  | 'explanation'
  | 'translation'
  | 'critique'
  // Technical
  | 'programming'
  | 'debugging'
  | 'system-design'
  | 'data-analysis'
  | 'architecture'
  // Creative
  | 'storytelling'
  | 'ideation'
  | 'design'
  | 'synthesis'
  // Social
  | 'tone-matching'
  | 'persuasion'
  | 'teaching'
  | 'de-escalation'
  // Tool
  | 'api-usage'
  | 'code-execution'
  | 'file-parsing'
  | 'web-search'

export class AdvancedSkillRegistry {
  private skills: Map<string, AdvancedSkill> = new Map()
  private categoryMap: Map<SkillCategory, AdvancedSkill[]> = new Map()

  constructor() {
    this.initializeSkills()
  }

  private initializeSkills(): void {
    const skills: AdvancedSkill[] = [
      // COGNITIVE SKILLS
      {
        id: 'reasoning',
        name: 'Multi-step Reasoning',
        description: 'Break down problems logically, trace through implications',
        category: 'cognitive',
        subcategory: 'reasoning',
        capabilityLevel: 'expert',
        tools: [],
        confidence: 0.95,
        hallucination_risk: 0.1,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Trace through a function to find the bug',
          'Work through a math problem step by step',
          'Explain cause and effect relationships',
        ],
      },
      {
        id: 'problem-solving',
        name: 'Problem Decomposition',
        description: 'Break complex problems into manageable sub-problems',
        category: 'cognitive',
        subcategory: 'problem-solving',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.9,
        hallucination_risk: 0.15,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Create project task list',
          'Design algorithm for complex task',
          'Break down features into components',
        ],
      },
      {
        id: 'pattern-recognition',
        name: 'Pattern Matching',
        description: 'Identify patterns in code, data, or processes',
        category: 'cognitive',
        subcategory: 'pattern-recognition',
        capabilityLevel: 'expert',
        tools: ['fr', 'bash'],
        confidence: 0.92,
        hallucination_risk: 0.2,
        requires_grounding: true,
        requires_tools: ['fr'],
        examples: [
          'Find memory leak in code',
          'Identify security vulnerability',
          'Spot performance bottleneck',
        ],
      },
      {
        id: 'planning',
        name: 'Strategic Planning',
        description: 'Create detailed execution plans with dependencies',
        category: 'cognitive',
        subcategory: 'planning',
        capabilityLevel: 'expert',
        tools: ['tc', 'tl'],
        confidence: 0.88,
        hallucination_risk: 0.12,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Create project timeline',
          'Plan refactoring strategy',
          'Design deployment sequence',
        ],
      },
      {
        id: 'estimation',
        name: 'Effort Estimation',
        description: 'Estimate complexity, time, and resource requirements',
        category: 'cognitive',
        subcategory: 'estimation',
        capabilityLevel: 'intermediate',
        tools: [],
        confidence: 0.65,
        hallucination_risk: 0.4,
        requires_grounding: true,
        requires_tools: [],
        examples: [
          'Estimate task duration',
          'Gauge code complexity',
          'Predict resource needs',
        ],
      },

      // LANGUAGE SKILLS
      {
        id: 'writing',
        name: 'Code & Documentation Writing',
        description: 'Generate clear, idiomatic code and documentation',
        category: 'language',
        subcategory: 'writing',
        capabilityLevel: 'advanced',
        tools: ['wf', 'fe'],
        confidence: 0.9,
        hallucination_risk: 0.15,
        requires_grounding: false,
        requires_tools: ['wf', 'fe'],
        examples: [
          'Write production code',
          'Generate JSDoc comments',
          'Create README',
        ],
      },
      {
        id: 'summarization',
        name: 'Content Summarization',
        description: 'Extract and condense key information from large texts',
        category: 'language',
        subcategory: 'summarization',
        capabilityLevel: 'advanced',
        tools: ['fr', 'wf2'],
        confidence: 0.85,
        hallucination_risk: 0.2,
        requires_grounding: true,
        requires_tools: ['fr'],
        examples: [
          'Summarize codebase structure',
          'Extract key points from documentation',
          'Create meeting notes summary',
        ],
      },
      {
        id: 'explanation',
        name: 'Technical Explanation',
        description: 'Explain complex concepts at different levels',
        category: 'language',
        subcategory: 'explanation',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.88,
        hallucination_risk: 0.25,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Explain how a function works',
          'Break down algorithm for junior dev',
          'Explain architecture decisions',
        ],
      },
      {
        id: 'translation',
        name: 'Code Translation',
        description: 'Convert code between languages or paradigms',
        category: 'language',
        subcategory: 'translation',
        capabilityLevel: 'intermediate',
        tools: ['fr', 'wf', 'fe'],
        confidence: 0.7,
        hallucination_risk: 0.3,
        requires_grounding: true,
        requires_tools: [],
        examples: [
          'Convert Python to TypeScript',
          'Refactor callback to Promise',
          'Adapt pattern to language',
        ],
      },
      {
        id: 'critique',
        name: 'Code Review & Critique',
        description: 'Analyze code for quality, safety, and best practices',
        category: 'language',
        subcategory: 'critique',
        capabilityLevel: 'advanced',
        tools: ['fr', 'bash'],
        confidence: 0.82,
        hallucination_risk: 0.22,
        requires_grounding: true,
        requires_tools: ['fr'],
        examples: [
          'Review code for performance',
          'Check security issues',
          'Suggest improvements',
        ],
      },

      // TECHNICAL SKILLS
      {
        id: 'programming',
        name: 'Code Implementation',
        description: 'Write, modify, and manage code',
        category: 'technical',
        subcategory: 'programming',
        capabilityLevel: 'expert',
        tools: ['fe', 'wf', 'fr'],
        confidence: 0.92,
        hallucination_risk: 0.18,
        requires_grounding: false,
        requires_tools: ['wf', 'fe'],
        examples: [
          'Implement feature',
          'Write utility function',
          'Create API endpoint',
        ],
      },
      {
        id: 'debugging',
        name: 'Debugging & Troubleshooting',
        description: 'Identify and fix bugs systematically',
        category: 'technical',
        subcategory: 'debugging',
        capabilityLevel: 'advanced',
        tools: ['fr', 'bash', 'fe'],
        confidence: 0.85,
        hallucination_risk: 0.25,
        requires_grounding: true,
        requires_tools: ['fr', 'bash'],
        examples: [
          'Fix null pointer exception',
          'Debug async issue',
          'Trace memory leak',
        ],
      },
      {
        id: 'system-design',
        name: 'System Architecture Design',
        description: 'Design scalable, maintainable systems',
        category: 'technical',
        subcategory: 'system-design',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.75,
        hallucination_risk: 0.3,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Design database schema',
          'Plan API structure',
          'Create tech stack proposal',
        ],
      },
      {
        id: 'data-analysis',
        name: 'Data Analysis',
        description: 'Analyze and interpret data patterns',
        category: 'technical',
        subcategory: 'data-analysis',
        capabilityLevel: 'intermediate',
        tools: ['bash', 'fr'],
        confidence: 0.7,
        hallucination_risk: 0.35,
        requires_grounding: true,
        requires_tools: ['bash', 'fr'],
        examples: [
          'Analyze performance metrics',
          'Identify trends',
          'Statistical summary',
        ],
      },
      {
        id: 'architecture',
        name: 'Architecture Refactoring',
        description: 'Improve code structure and organization',
        category: 'technical',
        subcategory: 'architecture',
        capabilityLevel: 'advanced',
        tools: ['fr', 'fe', 'bash'],
        confidence: 0.8,
        hallucination_risk: 0.2,
        requires_grounding: true,
        requires_tools: ['fr', 'fe'],
        examples: [
          'Extract shared utilities',
          'Decouple modules',
          'Apply design pattern',
        ],
      },

      // CREATIVE SKILLS
      {
        id: 'storytelling',
        name: 'Narrative & Context Building',
        description: 'Tell coherent stories and build narrative context',
        category: 'creative',
        subcategory: 'storytelling',
        capabilityLevel: 'intermediate',
        tools: ['wf'],
        confidence: 0.75,
        hallucination_risk: 0.35,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Create compelling README',
          'Write tutorial narrative',
          'Build scenario descriptions',
        ],
      },
      {
        id: 'ideation',
        name: 'Creative Ideation',
        description: 'Generate novel ideas and alternatives',
        category: 'creative',
        subcategory: 'ideation',
        capabilityLevel: 'intermediate',
        tools: [],
        confidence: 0.7,
        hallucination_risk: 0.4,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Suggest feature ideas',
          'Propose optimization strategies',
          'Brainstorm solutions',
        ],
      },
      {
        id: 'design',
        name: 'UI/UX & Interface Design',
        description: 'Design user interfaces and workflows',
        category: 'creative',
        subcategory: 'design',
        capabilityLevel: 'intermediate',
        tools: ['wf'],
        confidence: 0.68,
        hallucination_risk: 0.4,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Sketch UI layout',
          'Design component API',
          'Plan user flow',
        ],
      },
      {
        id: 'synthesis',
        name: 'Information Synthesis',
        description: 'Combine concepts into new insights',
        category: 'creative',
        subcategory: 'synthesis',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.8,
        hallucination_risk: 0.25,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Connect patterns across domains',
          'Propose novel architecture',
          'Synthesize research findings',
        ],
      },

      // SOCIAL SKILLS
      {
        id: 'tone-matching',
        name: 'Tone & Voice Adaptation',
        description: 'Adjust communication style to context',
        category: 'social',
        subcategory: 'tone-matching',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.82,
        hallucination_risk: 0.1,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Match user formality level',
          'Adjust to expertise level',
          'Respond with appropriate emotion',
        ],
      },
      {
        id: 'persuasion',
        name: 'Persuasive Communication',
        description: 'Present compelling arguments',
        category: 'social',
        subcategory: 'persuasion',
        capabilityLevel: 'intermediate',
        tools: [],
        confidence: 0.65,
        hallucination_risk: 0.35,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Justify design choices',
          'Explain trade-offs',
          'Make recommendations',
        ],
      },
      {
        id: 'teaching',
        name: 'Teaching & Mentoring',
        description: 'Explain concepts to help learning',
        category: 'social',
        subcategory: 'teaching',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.8,
        hallucination_risk: 0.2,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Teach programming concept',
          'Guide through solution',
          'Scaffold learning',
        ],
      },
      {
        id: 'de-escalation',
        name: 'Conflict & Frustration De-escalation',
        description: 'Handle frustrated users, reduce tension',
        category: 'social',
        subcategory: 'de-escalation',
        capabilityLevel: 'advanced',
        tools: [],
        confidence: 0.88,
        hallucination_risk: 0.08,
        requires_grounding: false,
        requires_tools: [],
        examples: [
          'Acknowledge frustration',
          'Offer alternative approach',
          'Rebuild confidence',
        ],
      },

      // TOOL SKILLS
      {
        id: 'api-usage',
        name: 'API & Tool Integration',
        description: 'Use external APIs and services',
        category: 'tool',
        subcategory: 'api-usage',
        capabilityLevel: 'intermediate',
        tools: ['ws', 'wf2', 'bash'],
        confidence: 0.75,
        hallucination_risk: 0.3,
        requires_grounding: true,
        requires_tools: ['ws', 'wf2'],
        examples: [
          'API integration',
          'Web service calls',
          'Data fetching',
        ],
      },
      {
        id: 'code-execution',
        name: 'Code Execution & Testing',
        description: 'Run code and validate results',
        category: 'tool',
        subcategory: 'code-execution',
        capabilityLevel: 'advanced',
        tools: ['bash', 'fe', 'fr'],
        confidence: 0.9,
        hallucination_risk: 0.1,
        requires_grounding: true,
        requires_tools: ['bash'],
        examples: [
          'Run tests',
          'Execute scripts',
          'Validate output',
        ],
      },
      {
        id: 'file-parsing',
        name: 'File Parsing & Manipulation',
        description: 'Read and parse various file formats',
        category: 'tool',
        subcategory: 'file-parsing',
        capabilityLevel: 'advanced',
        tools: ['fr', 'bash'],
        confidence: 0.85,
        hallucination_risk: 0.15,
        requires_grounding: true,
        requires_tools: ['fr'],
        examples: [
          'Parse JSON config',
          'Read CSV data',
          'Extract from logs',
        ],
      },
      {
        id: 'web-search',
        name: 'Web Research & Knowledge Retrieval',
        description: 'Search for and retrieve external information',
        category: 'tool',
        subcategory: 'web-search',
        capabilityLevel: 'intermediate',
        tools: ['ws', 'wf2'],
        confidence: 0.7,
        hallucination_risk: 0.25,
        requires_grounding: true,
        requires_tools: ['ws'],
        examples: [
          'Search for library docs',
          'Find latest best practice',
          'Research error solution',
        ],
      },
    ]

    // Register skills
    skills.forEach(skill => {
      this.skills.set(skill.id, skill)

      // Organize by category
      if (!this.categoryMap.has(skill.category)) {
        this.categoryMap.set(skill.category, [])
      }
      this.categoryMap.get(skill.category)!.push(skill)
    })
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): AdvancedSkill | undefined {
    return this.skills.get(id)
  }

  /**
   * Get all skills in a category
   */
  getCategory(category: SkillCategory): AdvancedSkill[] {
    return this.categoryMap.get(category) || []
  }

  /**
   * Get all skills
   */
  getAllSkills(): AdvancedSkill[] {
    return Array.from(this.skills.values())
  }

  /**
   * Get skills by hallucination risk threshold
   */
  getLowHallucinationSkills(threshold: number = 0.2): AdvancedSkill[] {
    return Array.from(this.skills.values()).filter(s => s.hallucination_risk <= threshold)
  }

  /**
   * Get high-confidence skills
   */
  getHighConfidenceSkills(threshold: number = 0.85): AdvancedSkill[] {
    return Array.from(this.skills.values()).filter(s => s.confidence >= threshold)
  }

  /**
   * Get skills requiring grounding (external data)
   */
  getGroundedSkills(): AdvancedSkill[] {
    return Array.from(this.skills.values()).filter(s => s.requires_grounding)
  }

  /**
   * Format for agent system prompt
   */
  formatForSystemPrompt(): string {
    const categories = Array.from(this.categoryMap.entries())

    const lines: string[] = [
      '## Your Capability Structure\n',
      'You have capabilities across multiple cognitive domains:\n',
    ]

    categories.forEach(([category, skills]) => {
      lines.push(`### ${category.toUpperCase()} SKILLS`)
      skills.forEach(skill => {
        const confidence = Math.round(skill.confidence * 100)
        lines.push(
          `- **${skill.name}** (${skill.capabilityLevel}): ${skill.description}`,
        )
        lines.push(`  Confidence: ${confidence}% | Hallucination Risk: ${Math.round(skill.hallucination_risk * 100)}%`)
      })
      lines.push('')
    })

    return lines.join('\n')
  }

  /**
   * Get skills for request type (Claude-style routing)
   */
  getSkillsForRequest(
    requestType: string,
  ): { primary: AdvancedSkill[]; secondary: AdvancedSkill[] } {
    const typeMap: Record<string, string[]> = {
      'code-generation': ['programming', 'writing', 'problem-solving'],
      'debugging': ['debugging', 'reasoning', 'pattern-recognition'],
      'research': ['web-search', 'summarization', 'pattern-recognition'],
      'design': ['system-design', 'architecture', 'problem-solving'],
      'documentation': ['writing', 'explanation', 'synthesis'],
      'teaching': ['teaching', 'explanation', 'tone-matching'],
      'refactoring': ['architecture', 'critique', 'reasoning'],
      'planning': ['planning', 'problem-solving', 'estimation'],
    }

    const skillIds = typeMap[requestType.toLowerCase()] || ['reasoning', 'problem-solving']

    const primary = skillIds
      .map(id => this.skills.get(id))
      .filter((s): s is AdvancedSkill => s !== undefined)

    // Secondary: high-confidence skills that aren't primary
    const secondary = this.getHighConfidenceSkills().filter(
      s => !primary.find(p => p.id === s.id),
    )

    return { primary, secondary }
  }
}
