/**
 * Skill Registry: Manages capabilities and knowledge skills
 * Similar to Claude Code skills system
 */

export interface Skill {
  name: string
  description: string
  category: 'code' | 'analysis' | 'execution' | 'knowledge' | 'creativity'
  enabled: boolean
  tools: string[]
}

export interface SkillCategory {
  name: string
  skills: Skill[]
}

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map()
  private categories: Map<string, SkillCategory> = new Map()

  constructor() {
    this.initializeDefaultSkills()
  }

  private initializeDefaultSkills(): void {
    // Code Execution Skills
    const codeSkills: Skill[] = [
      {
        name: 'bash-execution',
        description: 'Execute bash commands and scripts',
        category: 'execution',
        enabled: true,
        tools: ['bash'],
      },
      {
        name: 'file-editing',
        description: 'Create, read, and modify files with precision',
        category: 'code',
        enabled: true,
        tools: ['fe', 'wf', 'fr'],
      },
      {
        name: 'directory-management',
        description: 'Create, list, and manage directories',
        category: 'execution',
        enabled: true,
        tools: ['mkdir', 'ls', 'rmf'],
      },
      {
        name: 'git-integration',
        description: 'Git operations like commit, push, branch management',
        category: 'execution',
        enabled: true,
        tools: ['git'],
      },
    ]

    // Knowledge & Research Skills
    const knowledgeSkills: Skill[] = [
      {
        name: 'web-search',
        description: 'Search the internet for information',
        category: 'knowledge',
        enabled: true,
        tools: ['ws'],
      },
      {
        name: 'web-fetch',
        description: 'Fetch and analyze web page content',
        category: 'knowledge',
        enabled: true,
        tools: ['wf2'],
      },
      {
        name: 'knowledge-base',
        description: 'Query persistent knowledge base and context',
        category: 'knowledge',
        enabled: true,
        tools: ['kb'],
      },
    ]

    // Task & Project Management
    const taskSkills: Skill[] = [
      {
        name: 'task-management',
        description: 'Create, track, and update project tasks',
        category: 'execution',
        enabled: true,
        tools: ['tc', 'tl', 'tu', 'tc2'],
      },
      {
        name: 'project-planning',
        description: 'Analyze projects and create execution plans',
        category: 'analysis',
        enabled: true,
        tools: ['tc', 'tl'],
      },
    ]

    // Analysis & Creativity
    const analysisSkills: Skill[] = [
      {
        name: 'code-analysis',
        description: 'Analyze code for patterns, issues, and improvements',
        category: 'analysis',
        enabled: true,
        tools: ['fr', 'bash'],
      },
      {
        name: 'problem-solving',
        description: 'Break down complex problems into steps',
        category: 'analysis',
        enabled: true,
        tools: [],
      },
      {
        name: 'creative-writing',
        description: 'Generate documentation, comments, and creative content',
        category: 'creativity',
        enabled: true,
        tools: ['wf'],
      },
      {
        name: 'debugging',
        description: 'Identify and fix bugs in code',
        category: 'analysis',
        enabled: true,
        tools: ['fr', 'fe', 'bash'],
      },
      {
        name: 'refactoring',
        description: 'Improve code quality and structure',
        category: 'code',
        enabled: true,
        tools: ['fr', 'fe'],
      },
    ]

    // Register all skills
    const allSkills = [...codeSkills, ...knowledgeSkills, ...taskSkills, ...analysisSkills]
    allSkills.forEach(skill => this.skills.set(skill.name, skill))

    // Organize by category
    const categories = ['code', 'analysis', 'execution', 'knowledge', 'creativity']
    categories.forEach(cat => {
      const categorySkills = allSkills.filter(s => s.category === cat)
      this.categories.set(cat, { name: cat, skills: categorySkills })
    })
  }

  /**
   * Get a specific skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name)
  }

  /**
   * Get all skills in a category
   */
  getCategory(category: string): SkillCategory | undefined {
    return this.categories.get(category)
  }

  /**
   * Get all available skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values())
  }

  /**
   * Enable a skill
   */
  enableSkill(name: string): boolean {
    const skill = this.skills.get(name)
    if (skill) {
      skill.enabled = true
      return true
    }
    return false
  }

  /**
   * Disable a skill
   */
  disableSkill(name: string): boolean {
    const skill = this.skills.get(name)
    if (skill) {
      skill.enabled = false
      return true
    }
    return false
  }

  /**
   * Get enabled skills for a specific use case
   */
  getSkillsFor(useCase: string): Skill[] {
    const useCaseMap: Record<string, string[]> = {
      'code-generation': ['file-editing', 'code-analysis', 'problem-solving'],
      'debugging': ['code-analysis', 'debugging', 'bash-execution'],
      'research': ['web-search', 'web-fetch', 'knowledge-base'],
      'project': ['project-planning', 'task-management', 'git-integration'],
      'refactoring': ['code-analysis', 'refactoring', 'file-editing'],
    }

    const requiredSkills = useCaseMap[useCase] || []
    return requiredSkills
      .map(name => this.skills.get(name))
      .filter((s): s is Skill => s !== undefined && s.enabled)
  }

  /**
   * Format skills for AI context
   */
  formatForContext(): string {
    const categories = Array.from(this.categories.values())
    const lines: string[] = ['## Available Skills\n']

    categories.forEach(cat => {
      lines.push(`### ${cat.name.toUpperCase()}`)
      cat.skills.forEach(skill => {
        const status = skill.enabled ? '✓' : '✗'
        lines.push(`${status} ${skill.name}: ${skill.description}`)
      })
      lines.push('')
    })

    return lines.join('\n')
  }
}
