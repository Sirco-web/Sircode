/**
 * Knowledge Database for AI Models (EXPANDED v16)
 * 60+ coding patterns, best practices, and solutions for small LLMs
 * Covers web, backend, architecture, testing, performance, and more
 */

export interface KnowledgeEntry {
  id: string
  topic: string
  keywords: string[]
  content: string
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // HTML & Semantic Web
  { id: 'html-structure', topic: 'HTML Best Practices', keywords: ['html', 'structure', 'semantic', 'doctype'], content: `HTML5: <!DOCTYPE html>, <html lang="en">, <head> with <meta charset="UTF-8"> and viewport. Use semantic: <header>, <nav>, <main>, <article>, <aside>, <footer>. Never <div> for text containers.` },
  { id: 'html-forms', topic: 'HTML Forms', keywords: ['form', 'input', 'label', 'validation', 'submit'], content: `Use <label for="id"> with <input id="id">. Type attribute: email, password, number, date, tel, url. <fieldset> for groups. required, disabled, readonly attributes. Submit must be type="submit" in <form>.` },
  { id: 'html-access', topic: 'HTML Accessibility', keywords: ['a11y', 'aria', 'wcag', 'screen-reader'], content: `Semantic HTML first (nav, button, label). Alt text on images. ARIA for custom components. lang attribute. role when semantic unavailable. Keyboard navigation tested.` },
  { id: 'html-meta', topic: 'Meta Tags & SEO', keywords: ['meta', 'og', 'twitter', 'seo', 'social'], content: `Essential: charset, viewport, description. Social: og:title, og:description, og:image. Twitter: twitter:card. Favicon, theme-color. Robots meta for crawling.` },
  
  // CSS Layouts
  { id: 'css-flex', topic: 'CSS Flexbox', keywords: ['flexbox', 'flex', 'layout', 'justify', 'align'], content: `1D layout. Container: display:flex, flex-direction, justify-content, align-items, gap. Items: flex (1 for equal), flex-grow/shrink/basis. align-self overrides align-items.` },
  { id: 'css-grid', topic: 'CSS Grid', keywords: ['grid', 'layout', '2d', 'columns', 'rows'], content: `2D complex. display:grid, grid-template-columns (fr, auto, repeat()), gap. Auto-fit/auto-fill for responsive. grid-area for placement. Combine with Flexbox inside cells.` },
  { id: 'css-responsive', topic: 'Responsive Design', keywords: ['responsive', 'mobile-first', 'media-query', 'breakpoint'], content: `Mobile-first: base CSS for mobile, add min-width queries. Breakpoints: 640(sm), 768(md), 1024(lg), 1280(xl). Use %, vh/vw. clamp() for scaling.` },
  { id: 'css-units', topic: 'CSS Units & Sizing', keywords: ['rem', 'em', 'vh', 'vw', 'box-sizing'], content: `rem for font (16px=1rem base). em for relative. ALWAYS box-sizing:border-box on *. max-width for containers (~1200px). gap instead of margin. Use flex:1 for equal distribution.` },
  { id: 'css-colors', topic: 'CSS Colors', keywords: ['color', 'contrast', 'wcag', 'palette', 'hsl'], content: `CSS variables: --color: #3b82f6. Contrast 4.5:1 text (WCAG AA). hsl() for variants: hsl(200,100%,50%). Avoid pure black on white. color:inherit for icons.` },
  { id: 'css-spacing', topic: 'CSS Spacing', keywords: ['spacing', 'margin', 'padding', 'gap', 'rhythm'], content: `Scale: 0.5rem, 1rem, 1.5rem, 2rem, 3rem, 4rem. gap for flex/grid items. No margin collapse with gap. Padding inside, margin outside.` },
  { id: 'css-effects', topic: 'CSS Effects', keywords: ['shadow', 'effect', 'blur', 'transform', 'animation'], content: `box-shadow: 0 1px 3px rgba(0,0,0,0.1). transform for perf (not position). transition for smoothness. @keyframes for complex. will-change sparingly. filter for effects.` },
  { id: 'css-pseudos', topic: 'CSS Pseudo-elements', keywords: ['pseudo', 'before', 'after', 'first', 'hover'], content: `::before, ::after for decoration (not content). :hover, :focus, :active for states. :first-child, :nth-child(). ::selection for highlights. :focus-visible for keyboard.` },
  
  // JavaScript Fundamentals
  { id: 'js-vars', topic: 'JavaScript Variables', keywords: ['var', 'let', 'const', 'scope', 'hoisting'], content: `NEVER var. const default, let if reassign needed. Block scope. const prevents reassignment but not mutation. Destructure: const {name, age} = obj. Template literals: \`Hello \${name}\`.` },
  { id: 'js-functions', topic: 'JavaScript Functions', keywords: ['function', 'arrow', 'parameter', 'return', 'scope'], content: `Arrow for callbacks (shorter, binds this). Regular for methods/constructors. Keep <20 lines. Default params. Rest: ...args. Return early. Avoid side effects.` },
  { id: 'js-async', topic: 'JavaScript Async/Await', keywords: ['async', 'await', 'promise', 'then', 'catch'], content: `async/await over .then(). Always try/catch async. await pauses execution. Promise.all() parallel. Promise.allSettled() wait all. Handle rejection. Return promises from async.` },
  { id: 'js-arrays', topic: 'Array Methods', keywords: ['array', 'map', 'filter', 'reduce', 'find', 'forEach'], content: `map() transform. filter() select. reduce() aggregate. find() first match. forEach() side effects. Spread: [...a1, ...a2]. Destructure: const [first, ...rest].` },
  { id: 'js-objects', topic: 'JavaScript Objects', keywords: ['object', 'keys', 'values', 'entries', 'spread'], content: `Shorthand: {name, age}. Spread: {...obj, new}. Destructure: {name, age} = user. Object.keys/values/entries. for...of arrays, for...in objects.` },
  { id: 'js-dom', topic: 'JavaScript DOM', keywords: ['dom', 'querySelector', 'event', 'listener', 'element'], content: `querySelector (single), querySelectorAll (multi). addEventListener not onclick. e.preventDefault(), e.stopPropagation(). e.target vs e.currentTarget. Event delegation for dynamic.` },
  { id: 'js-events', topic: 'Event Handling', keywords: ['event', 'listener', 'click', 'submit', 'keydown'], content: `addEventListener('event', handler). e.preventDefault() for forms. e.stopPropagation() stop bubble. Target vs currentTarget. Delegated for dynamic content. Remove listeners to prevent leaks.` },
  { id: 'js-classes', topic: 'JavaScript Classes', keywords: ['class', 'constructor', 'method', 'extend', 'super'], content: `class syntax. constructor() init. Methods in body. super() in subclass. static for utilities. private fields: #. Getters/setters: get name() {}.` },
  { id: 'js-errors', topic: 'Error Handling', keywords: ['error', 'try', 'catch', 'throw', 'finally'], content: `try/catch/finally blocks. Check null/undefined. typeof for types. Custom: throw new Error(). Finally always runs. Log errors, don't expose to users.` },
  { id: 'js-scope', topic: 'Scope & Closures', keywords: ['scope', 'closure', 'global', 'local', 'lexical'], content: `Functions create scope. Inner access outer. Closures remember scope. Avoid globals. Module pattern or classes encapsulate. Block scope with let/const.` },
  { id: 'js-string', topic: 'String Methods', keywords: ['string', 'substring', 'split', 'includes', 'trim'], content: `charAt(i), substring(start, end), slice(). split(sep), join(sep). includes(str), startsWith(), endsWith(). toUpperCase(), toLowerCase(). trim() whitespace.` },
  { id: 'js-number', topic: 'Number & Math', keywords: ['number', 'parse', 'math', 'isnan', 'math.max'], content: `parseFloat(), parseInt(radix). Number.isInteger(), isNaN(). Math.floor/ceil/round. Math.max/min. Math.random() 0-1. Avoid floating point issues with precision.` },
  
  // Algorithms & Logic
  { id: 'calculator', topic: 'Calculator Implementation', keywords: ['calculator', 'math', 'operator', 'logic'], content: `State: display, prev value, operator. On digit append. On operator store+clear. On = calculate result. Handle ÷0. Format display. Clear with C. Use parseFloat.` },
  { id: 'validation', topic: 'Validation', keywords: ['validation', 'check', 'regex', 'parse', 'sanitize'], content: `Check isNaN post-parseFloat. Use Number.isInteger(). Regex: /^[0-9]+$/ digits. parseFloat handles strings. Check min/max. Test edge: 0, negative, decimals. Never trust user input.` },
  { id: 'conditionals', topic: 'Conditional Logic', keywords: ['if', 'switch', 'ternary', 'condition'], content: `Ternary simple: x ? y : z. switch multiple values. if/else complex logic. Early return. Avoid nested - extract functions. Use booleans. Check falsy carefully (0, "", null).` },
  { id: 'loops', topic: 'Loop Best Practices', keywords: ['loop', 'for', 'while', 'foreach', 'iteration'], content: `for...of arrays. forEach/map functional. while unknown iterations. break/continue control. No infinite loops. Prefer methods over loops. Keep simple.` },
  
  // Project Structure
  { id: 'file-struct', topic: 'Project File Structure', keywords: ['files', 'organization', 'project'], content: `Structure: index.html (root), css/style.css, js/app.js, assets/. By feature if large. Keep files <500 lines. One component/file. Modules import/export. Separate concerns.` },
  { id: 'naming', topic: 'Naming Conventions', keywords: ['naming', 'variable', 'function', 'class'], content: `Variables/functions camelCase. Classes PascalCase. Constants UPPER_SNAKE_CASE. Descriptive (not x,y). Booleans is/has/can prefix (isActive). Private _prefix. Avoid single letters except loops.` },
  { id: 'comments', topic: 'Comments & Documentation', keywords: ['comment', 'doc', 'docstring', 'jsdoc'], content: `Comments explain WHY, not WHAT. JSDoc: /** @param {type} name */. One per line. Keep updated. Avoid obvious. TODO for future. Explain complex logic and edge cases.` },
  { id: 'dry', topic: 'DRY Principle', keywords: ['dry', 'repetition', 'refactor', 'extract', 'reuse'], content: `Code 2+ times → extract function. Use loops for repetition. Array methods instead of loops. Share CSS classes. Template literals for strings. Create utilities. No copy-paste.` },
  { id: 'clean-code', topic: 'Clean Code Practices', keywords: ['clean', 'readable', 'maintainable', 'best'], content: `Small functions. Single responsibility. Meaningful names. Remove dead code. DRY/KISS principles. Consistent style. Avoid deep nesting. Write for readability first.` },
  
  // Performance
  { id: 'perf-opt', topic: 'Performance Optimization', keywords: ['performance', 'optimization', 'speed', 'render'], content: `Minimize DOM changes. CSS for animations not JS. Lazy load images. Defer non-critical JS. Efficient layout (Grid/Flex). Minimize HTTP. Compress images. Remove unused CSS.` },
  { id: 'debug', topic: 'Browser Debugging', keywords: ['debug', 'console', 'devtools', 'breakpoint'], content: `console.log, console.table. console.error. console.time/timeEnd. DevTools Elements/Network/Sources. Breakpoints in Sources. debugger statement. Network tab for requests.` },
  
  // Web APIs & Features
  { id: 'storage', topic: 'LocalStorage & Session', keywords: ['localstorage', 'storage', 'persist', 'data'], content: `localStorage.setItem('k', JSON.stringify(obj)). getItem('k'). JSON.parse() result. Persists after reload. sessionStorage on tab close. 5-10MB limit. clear() or removeItem().` },
  { id: 'fetch', topic: 'Fetch API & HTTP', keywords: ['fetch', 'http', 'request', 'api', 'json', 'cors'], content: `fetch(url, {method, headers, body}). await response. response.json() or .text(). Check response.ok. .catch() for errors. CORS: server allows origin. Content-Type header for POST.` },
  { id: 'apis', topic: 'Browser APIs', keywords: ['api', 'geolocation', 'notification', 'camera'], content: `Geolocation: navigator.geolocation.getCurrentPosition(). Notifications API with permissions. Camera: MediaStream. FileReader for uploads. Battery/Network APIs. Always request permissions first.` },
  
  // Testing & QA
  { id: 'testing', topic: 'Testing Best Practices', keywords: ['test', 'unit', 'integration', 'jest', 'qa'], content: `Test critical paths first. Write for bugs. Keep simple. One assertion per test. Descriptive names. Test edge cases (empty, null, large). Mock dependencies. 80%+ coverage goal.` },
  { id: 'edge-cases', topic: 'Edge Cases Testing', keywords: ['edge', 'case', 'test', 'boundary'], content: `Empty (null, '', [], {}). Large (max int, long strings). Special chars (!@#$%^&*). Whitespace. Off-by-one. Division by zero. Invalid types. Concurrent requests. Timeout.` },
  
  // Accessibility
  { id: 'wcag', topic: 'WCAG Accessibility', keywords: ['wcag', 'a11y', 'accessibility', 'standard'], content: `Levels: A (min), AA (standard), AAA (enhanced). Perceivable, Operable, Understandable, Robust. 4.5:1 contrast. Keyboard accessible. Clear language. Assistive tech compatible.` },
  { id: 'keyboard', topic: 'Keyboard Navigation', keywords: ['keyboard', 'tab', 'focus', 'a11y'], content: `Tab order logical. tabindex 0 or -1. Focus visible: outline-offset:2px. All interactive keyboard accessible. :focus-visible. Test without mouse.` },
  { id: 'contrast', topic: 'Color Contrast', keywords: ['contrast', 'color', 'accessible', 'wcag'], content: `AA: 4.5:1 normal, 3:1 large. AAA: 7:1 normal, 4.5:1 large. WebAIM checker. Avoid red-green issues. Patterns not just color. Light bg = dark text.` },
  
  // Forms & Input
  { id: 'form-valid', topic: 'Form Validation', keywords: ['form', 'validation', 'input', 'error'], content: `HTML: type, required, minlength, pattern. Error messages near fields. aria-invalid. Validate on change (UX) + submit (security). Server-side always. Clear on fix.` },
  { id: 'form-submit', topic: 'Form Submission', keywords: ['submit', 'form', 'event', 'prevent'], content: `form.addEventListener('submit', e=>{ e.preventDefault() }). Collect data. Validate. Disable button while processing. Show loading. Handle errors. Clear on success. User feedback.` },
  
  // Git & Version Control
  { id: 'git-workflow', topic: 'Git Workflow', keywords: ['git', 'commit', 'branch', 'pull', 'push'], content: `Branch per feature: git checkout -b feature/name. Commit often, clear messages. Pull before push. Rebase/merge to main. Atomic commits. Meaningful branch names.` },
  { id: 'git-commits', topic: 'Git Commit Messages', keywords: ['commit', 'message', 'convention'], content: `Format: type(scope): subject. Types: feat, fix, refactor, style, docs, test, perf. <50 chars. Imperative: "fix bug" not "fixed". Body for details. Reference: fixes #123.` },
  
  // Backend Basics
  { id: 'rest-api', topic: 'REST API Design', keywords: ['api', 'rest', 'http', 'endpoint', 'method'], content: `GET retrieve, POST create, PUT replace, PATCH update, DELETE remove. Nouns for resources: /users. 200 OK, 201 Created, 400 Bad, 404 Not Found, 500 Error. JSON responses.` },
  { id: 'json', topic: 'JSON Format', keywords: ['json', 'format', 'data', 'api', 'structure'], content: `Strings "", numbers unquoted, true/false/null lowercase. null for missing, "" for blank. Arrays [{id:1}]. Nested for relations. Keep flat when possible.` },
  
  // Security
  { id: 'security', topic: 'Web Security Basics', keywords: ['security', 'xss', 'csrf', 'injection'], content: `Trust no user input. XSS: sanitize HTML, textContent not innerHTML. CSRF: validate token. SQL injection: parameterized queries. HTTPS only. No hardcoded secrets. CSP headers.` },
  { id: 'auth', topic: 'Authentication & Passwords', keywords: ['password', 'auth', 'security', 'hash'], content: `Never store plain passwords. Use bcrypt/argon2 hashing. Hash backend only. HTTPS for auth. Rate limit login. Session/JWT tokens. NEVER send password in URL/email.` },
  
  // Design Patterns
  { id: 'modal', topic: 'Modal & Dialog', keywords: ['modal', 'dialog', 'popup', 'overlay'], content: `Use <dialog> or div overlay. Center with flexbox/grid. ::backdrop pseudo. Trap focus. Esc closes. Disable body scroll. Return focus to trigger on close.` },
  { id: 'dropdown', topic: 'Dropdown Menu', keywords: ['dropdown', 'menu', 'select', 'navigation'], content: `Button for toggle, ul/li for items. Toggle display:hidden. Close on outside click. Keyboard arrow navigation. Enter/Space select. Close on selection.` },
  { id: 'carousel', topic: 'Carousel & Slider', keywords: ['carousel', 'slider', 'swipe', 'navigation'], content: `Show 1-N items, prev/next nav. transform:translateX smooth. Auto-play timer. Touch support/swipe. Infinite loop: clone items. A11y: buttons, focus mgmt.` },
  
  // Common Issues
  { id: 'zindex', topic: 'Z-Index & Stacking', keywords: ['z-index', 'stacking', 'layer', 'overlap'], content: `z-index needs position (relative/absolute/fixed). Creates stacking context. Parent z-index limits children. Lower = base, higher = overlays. Modals 1000+. Keep reference system.` },
  { id: 'css-bugs', topic: 'Common CSS Issues', keywords: ['css', 'bug', 'problem', 'issue'], content: `Specificity: avoid !important. Margin collapse: padding/gap. Overflow:hidden creates stacking. Floats: use Flex/Grid. Position checks parent. Check cascade for inheritance.` },
  { id: 'js-bugs', topic: 'Common JS Mistakes', keywords: ['bug', 'mistake', 'error', 'common'], content: `Forgot this binding. Async/await no try/catch. == vs ===. Modify while iterating. Closure issues. Event listener leaks. Global pollution. Off-by-one loops.` },
  
  // Advanced Topics
  { id: 'regex', topic: 'Regular Expressions', keywords: ['regex', 'pattern', 'match', 'test', 'replace'], content: `Regex for patterns. /pattern/flags. test() boolean, match() array, replace() sub. ^ start, $ end. . any, * 0+, + 1+, ? 0-1. [a-z]. Groups (). Escape special.` },
  { id: 'closure', topic: 'JavaScript Closures', keywords: ['closure', 'scope', 'function', 'memory'], content: `Inner function accesses outer scope. Closures persist scope. Used for encapsulation. Callbacks capture context. Be aware of memory (closure can prevent GC). IIFE pattern.` },
  { id: 'promises', topic: 'Promises & Chaining', keywords: ['promise', 'then', 'chain', 'state', 'resolve'], content: `Pending → Resolved/Rejected. .then(success, error). Chain multiple .then(). .catch() for errors. .finally() always runs. Promise.all() wait all. Promise.race() first.` },
  { id: 'debounce', topic: 'Debounce & Throttle', keywords: ['debounce', 'throttle', 'event', 'performance'], content: `Debounce: delay execution until stop (form inputs, search). Wait X ms after last trigger. Throttle: limit frequency (scroll, resize). Run every X ms max. Prevent excessive calls.` },
  { id: 'modules', topic: 'ES6 Modules', keywords: ['module', 'import', 'export', 'es6'], content: `export default func. export { func1, func2 }. import defaultFunc from 'path'. import { func } from 'path'. Avoid circular imports. Use relative paths. Bundlers combine.` }
];

export class KnowledgeBase {
  /**
   * Search knowledge base by keywords
   */
  static search(query: string, maxResults = 5): KnowledgeEntry[] {
    const q = query.toLowerCase()
    return KNOWLEDGE_BASE
      .filter(entry =>
        entry.keywords.some(kw => kw.includes(q) || q.includes(kw)) ||
        entry.topic.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q)
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
   * Format entries for prompt injection
   */
  static formatForPrompt(entries: KnowledgeEntry[]): string {
    if (entries.length === 0) return ''
    return entries
      .map(e => `**${e.topic}**: ${e.content}`)
      .join('\n\n')
  }

  /**
   * List all available topics
   */
  static listTopics(): string[] {
    return [...new Set(KNOWLEDGE_BASE.map(e => e.topic))]
  }

  /**
   * Add new entry to knowledge base
   */
  static add(entry: KnowledgeEntry): void {
    KNOWLEDGE_BASE.push(entry)
  }

  /**
   * Get total entries
   */
  static count(): number {
    return KNOWLEDGE_BASE.length
  }

  /**
   * Get random entry
   */
  static random(): KnowledgeEntry {
    return KNOWLEDGE_BASE[Math.floor(Math.random() * KNOWLEDGE_BASE.length)]
  }
}
