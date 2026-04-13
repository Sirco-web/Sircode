/**
 * Knowledge Database for AI Models
 * Provides coding patterns, best practices, and common solutions
 * Helps smaller models (3b, 7b) make better decisions
 */

export interface KnowledgeEntry {
  id: string
  topic: string
  keywords: string[]
  content: string
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'html-structure',
    topic: 'HTML Best Practices',
    keywords: ['html', 'structure', 'semantic', 'DOCTYPE'],
    content: `HTML Structure: Always start with <!DOCTYPE html>, use semantic tags (header, nav, main, footer), proper head with meta tags (charset, viewport). Lang attribute on html tag.`
  },
  {
    id: 'css-layout',
    topic: 'CSS Layout Patterns',
    keywords: ['css', 'flexbox', 'grid', 'layout', 'responsive'],
    content: `Use flexbox for 1D layouts (rows/cols), CSS Grid for 2D. Mobile-first: min-width media queries. Use rem/em for sizes (not px). Set box-sizing: border-box on *`
  },
  {
    id: 'js-dom',
    topic: 'JavaScript DOM',
    keywords: ['javascript', 'dom', 'querySelector', 'event', 'listener'],
    content: `Use document.querySelector for single elements, querySelectorAll for multiple. Add event listeners with addEventListener. Always check element exists before manipulating.`
  },
  {
    id: 'js-functions',
    topic: 'JavaScript Functions',
    keywords: ['function', 'arrow', 'async', 'promise', 'callback'],
    content: `Use arrow functions for callbacks/array methods. Use async/await over promises. Functions should do one thing. Use const/let, never var. Keep functions < 20 lines.`
  },
  {
    id: 'calculator-logic',
    topic: 'Calculator Implementation',
    keywords: ['calculator', 'math', 'operations', 'display'],
    content: `Store display state. Track operator and previous value. When new operator pressed, calculate result. Handle division by zero. Format numbers for display. Clear on 'C' button.`
  },
  {
    id: 'file-structure',
    topic: 'Project File Structure',
    keywords: ['files', 'project', 'organization', 'structure'],
    content: `Organize by feature/component. Keep index.html at root. CSS in css/, JS in js/. Keep style.css small. Separate concerns - HTML structure, CSS styling, JS behavior.`
  },
  {
    id: 'accessibility',
    topic: 'Web Accessibility',
    keywords: ['accessible', 'aria', 'semantic', 'keyboard', 'contrast'],
    content: `Use semantic HTML (buttons, links, labels). Add aria-labels. Ensure 4.5:1 contrast ratio. Make interactive elements keyboard accessible. Test with screen reader.`
  },
  {
    id: 'naming-conventions',
    topic: 'Naming Conventions',
    keywords: ['naming', 'variable', 'function', 'class'],
    content: `Variables/functions: camelCase. Classes: PascalCase. Constants: UPPER_SNAKE_CASE. Use descriptive names (not x, y). Booleans start with is/has/can (isActive, hasError).`
  },
  {
    id: 'error-handling',
    topic: 'Error Handling',
    keywords: ['error', 'try', 'catch', 'validation', 'check'],
    content: `Always validate user input. Use try/catch for error-prone code. Check for null/undefined. Provide helpful error messages. Fail gracefully with defaults.`
  },
  {
    id: 'performance',
    topic: 'Web Performance',
    keywords: ['performance', 'fast', 'optimize', 'cache', 'minimize'],
    content: `Minimize CSS/JS bundles. Use media queries for images. Cache static assets. Lazy-load non-critical content. Debounce/throttle frequent events. Use requestAnimationFrame for animations.`
  },
  {
    id: 'responsive-design',
    topic: 'Responsive Web Design',
    keywords: ['responsive', 'mobile', 'breakpoint', 'media-query'],
    content: `Use flexible grid (%), not fixed widths. Set viewport meta tag. Mobile-first approach. Common breakpoints: 480px (mobile), 768px (tablet), 1024px (desktop). Test on real devices.`
  },
  {
    id: 'form-handling',
    topic: 'Form Handling',
    keywords: ['form', 'input', 'submit', 'validation', 'label'],
    content: `Always use form element. Link labels to inputs with for/id. Validate on change/submit. Show errors near fields. Use appropriate input types (email, number, etc). Provide feedback.`
  },
  {
    id: 'git-workflow',
    topic: 'Git Workflow',
    keywords: ['git', 'commit', 'branch', 'push', 'pull'],
    content: `Commit often with clear messages. One feature per branch. Pull before push. Rebase or merge cleanly. Use .gitignore for build files. Tag releases.`
  },
  {
    id: 'testing-basics',
    topic: 'Testing Basics',
    keywords: ['test', 'unit', 'integration', 'jest', 'assert'],
    content: `Write tests for core logic. Test edge cases (empty, null, large numbers). Use descriptive test names. Mock external dependencies. Aim for >80% coverage.`
  },
  {
    id: 'component-design',
    topic: 'Component Design',
    keywords: ['component', 'reusable', 'prop', 'state', 'render'],
    content: `Components should be small and focused. Accept props for customization. Manage state efficiently. Separate container/presentation components. Use fragments to avoid extra DOM nodes.`
  }
];

export class KnowledgeBase {
  /**
   * Search knowledge base for relevant entries
   */
  static search(query: string, maxResults = 5): KnowledgeEntry[] {
    const q = query.toLowerCase()
    
    return KNOWLEDGE_BASE
      .filter(entry => 
        entry.topic.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.keywords.some(kw => kw.includes(q.split(' ')[0]))
      )
      .slice(0, maxResults)
  }

  /**
   * Get all entries for a topic
   */
  static getTopic(topic: string): KnowledgeEntry[] {
    return KNOWLEDGE_BASE.filter(e => 
      e.topic.toLowerCase().includes(topic.toLowerCase())
    )
  }

  /**
   * Format knowledge for AI prompt
   */
  static formatForPrompt(entries: KnowledgeEntry[]): string {
    if (entries.length === 0) return ''
    
    return `📚 RELEVANT KNOWLEDGE:\n${entries
      .map(e => `• ${e.topic}: ${e.content}`)
      .join('\n')}\n`
  }

  /**
   * Add custom knowledge (for extending database)
   */
  static add(entry: Omit<KnowledgeEntry, 'id'>): void {
    const id = entry.topic.toLowerCase().replace(/\s+/g, '-')
    KNOWLEDGE_BASE.push({ id, ...entry })
  }

  /**
   * Get all available topics
   */
  static listTopics(): string[] {
    return [...new Set(KNOWLEDGE_BASE.map(e => e.topic))]
  }
}
