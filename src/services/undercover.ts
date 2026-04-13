/**
 * Undercover Mode - Security Layer
 * Prevents internal secrets and sensitive data from leaking into commits/outputs
 * Redacts API keys, tokens, passwords, private paths, and internal notes
 */

export interface RedactionPattern {
  name: string
  pattern: RegExp
  replacement: string
}

export interface RedactionResult {
  original: string
  redacted: string
  found: Array<{ name: string; matches: string[] }>
}

export class UncoverMode {
  private readonly patterns: RedactionPattern[] = [
    // API Keys and tokens
    {
      name: 'API Keys',
      pattern: /(\b[a-z_-]*api[_-]?key[s]?\b|\bsk-[a-zA-Z0-9]{20,}|pk_(?:live|test)_[a-zA-Z0-9]{24,})/gi,
      replacement: '[REDACTED_API_KEY]'
    },
    // Bearer tokens
    {
      name: 'Bearer Tokens',
      pattern: /bearer\s+[a-zA-Z0-9._\-]*/gi,
      replacement: 'bearer [REDACTED_TOKEN]'
    },
    // OAuth tokens
    {
      name: 'OAuth Tokens',
      pattern: /(oauth|access_token|authorization)[\s:=]+[a-zA-Z0-9._\-]{20,}/gi,
      replacement: '$1: [REDACTED_TOKEN]'
    },
    // Username/password combos
    {
      name: 'Password Credentials',
      pattern: /password\s*[:=]\s*[^\s,}";]+|passwd\s*[:=]\s*[^\s,}";]+/gi,
      replacement: 'password: [REDACTED]'
    },
    // SSH keys
    {
      name: 'SSH Keys',
      pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
      replacement: '[REDACTED_SSH_KEY]'
    },
    // Database connection strings
    {
      name: 'Database Strings',
      pattern: /(mongodb|postgres|mysql|mariadb):\/\/[^\s]+@[^\s]*/gi,
      replacement: '$1://[REDACTED_CREDENTIALS]@[REDACTED_HOST]'
    },
    // Email addresses (optional - less strict)
    {
      name: 'Email Patterns',
      pattern: /([a-zA-Z0-9._%-]+@anthropic|internal|secret|private|admin|root|test)\.(?:ai|com|net|org)/gi,
      replacement: '[REDACTED_EMAIL]'
    },
    // AWS/Azure/GCP credentials
    {
      name: 'Cloud Credentials',
      pattern: /(AWS_SECRET|AZURE_SECRET|GCP_KEY|SERVICE_ACCOUNT)[\s:=]+[^\s}";]+/gi,
      replacement: '$1=[REDACTED]'
    },
    // Private IP ranges
    {
      name: 'Internal IPs',
      pattern: /(?:10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)\d{1,3}\.\d{1,3}/g,
      replacement: '[REDACTED_INTERNAL_IP]'
    },
    // Local file paths with sensitive directories
    {
      name: 'Sensitive Paths',
      pattern: /\/(etc\/passwd|root\/|\.ssh\/|\.aws\/|\.azure\/|\.gcp\/|\.github\/|\.code\/secrets?)/gi,
      replacement: '[REDACTED_PATH]'
    },
    // Internal notes/comments markers
    {
      name: 'Internal Comments',
      pattern: /\/\*\s*(internal|secret|private|todo|fixme|hack|kludge|bug)[\s\S]*?\*\//gi,
      replacement: '[REDACTED_COMMENT]'
    }
  ]

  /**
   * Redact sensitive information from text
   */
  redact(text: string): RedactionResult {
    let redacted = text
    const found: Array<{ name: string; matches: string[] }> = []

    for (const { name, pattern, replacement } of this.patterns) {
      const matches = text.match(pattern)
      if (matches) {
        const uniqueMatches = [...new Set(matches)]
        found.push({ name, matches: uniqueMatches })
        redacted = redacted.replace(pattern, replacement)
      }
    }

    return {
      original: text,
      redacted,
      found
    }
  }

  /**
   * Check if text contains sensitive data
   */
  hasSensitiveData(text: string): boolean {
    return this.patterns.some(({ pattern }) => pattern.test(text))
  }

  /**
   * Get list of sensitive categories found
   */
  getCategories(text: string): string[] {
    const categories: Set<string> = new Set()
    for (const { name, pattern } of this.patterns) {
      if (pattern.test(text)) {
        categories.add(name)
      }
    }
    return Array.from(categories)
  }

  /**
   * Sanitize before commit (aggressive redaction)
   */
  sanitizeForCommit(text: string): string {
    let sanitized = text
    
    // Add extra aggressive patterns for commits
    const commitPatterns: RedactionPattern[] = [
      {
        name: 'Any URLs with credentials',
        pattern: /https?:\/\/[a-z0-9]+:[a-z0-9]+@/gi,
        replacement: 'https://[REDACTED]:'
      },
      {
        name: 'Hex token-like strings (40+ chars)',
        pattern: /\b[a-f0-9]{40,}\b/g,
        replacement: '[REDACTED_TOKEN]'
      }
    ]

    for (const { pattern, replacement } of commitPatterns) {
      sanitized = sanitized.replace(pattern, replacement)
    }

    // Also apply standard patterns
    const result = this.redact(sanitized)
    return result.redacted
  }

  /**
   * Get security report
   */
  getSecurityReport(text: string): {
    isSafe: boolean
    issues: number
    categories: string[]
    recommendation: string
  } {
    const result = this.redact(text)
    const issues = result.found.reduce((sum, f) => sum + f.matches.length, 0)
    const categories = result.found.map(f => f.name)

    return {
      isSafe: issues === 0,
      issues,
      categories,
      recommendation: issues > 0 
        ? `⚠️ Found ${issues} potential security issues in ${categories.length} categories. Redact before committing.`
        : '✓ Safe to commit'
    }
  }
}
