# Sircode Architecture & Agent System Design

This document explains the architecture of Sircode's autonomous agent system for developers who want to extend or contribute to the project.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (CLI)                     │
│                     (src/cli.ts)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  chat [model]    │  agent [model]  │  exec <query>   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │  Ollama     │   │  Exec       │   │  Context    │
   │  Service    │   │  Service    │   │  Service    │
   └─────────────┘   └─────────────┘   └─────────────┘
        │
        └──────────┬──────────┐
                   │          │
            ┌──────▼──┐  ┌───▼─────────┐
            │   Chat  │  │   Agent     │
            │  Mode   │  │   Mode      │
            └─────────┘  └─┬───────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌──────────┐   ┌──────────┐   ┌──────────────┐
   │Pensieve  │   │Skill     │   │Agent         │
   │(Thinking)│   │Registry  │   │Executor      │
   └──────────┘   └──────────┘   └──────────────┘
        │              │              │
        ▼              ▼              ▼
   ┌──────────────────────────────────────────┐
   │          Tool Execution Engine           │
   │          (src/tools/index.ts)            │
   │  ┌────────────────────────────────────┐  │
   │  │ bash | fr | fe | wf | git | ws | tc│  │
   │  └────────────────────────────────────┘  │
   └──────────────────────────────────────────┘
```

## Core Services

### 1. Ollama Service
**File:** `src/services/ollama.ts`

Handles all communication with the Ollama LLM API.

```typescript
class Ollama {
  // API calls to Ollama
  async chat(msgs: Msg[]): Promise<string>
  async *streamChat(msgs: Msg[]): AsyncGenerator<string>
  async ls(): Promise<string[]>  // List models
}
```

**Key Features:**
- Streaming support for real-time responses
- Timeout protection (10 minutes for large models)
- Model listing and selection
- Connection verification

### 2. Context Service
**File:** `src/services/context.ts`

Maintains conversation context for the AI.

```typescript
class ContextService {
  add(role: 'user' | 'assistant' | 'system', content: string): void
  forAPI(): Msg[]  // Formatted for Ollama API
  clear(): void
}
```

**Purpose:** Provides full conversation history to maintain context across turns.

### 3. Session Coordinator
**File:** `src/coordinator/session.ts`

Tracks session metadata and records operations.

```typescript
class SessionCoordinator {
  recordMessage(): void
  recordTool(name: string, result: ToolRes): void
  recordFileOp(type: 'create' | 'modify', path: string): void
  recordInsight(content: string): void
}
```

**Outputs:** Saves to `.code/` directory with session metadata.

## Agent Mode Components

### 4. Pensieve Service (Internal Thinking)
**File:** `src/services/pensieve.ts`

Enables AI to think and plan internally without showing intermediate steps.

```typescript
class Pensieve {
  async think(
    userRequest: string, 
    context: Msg[] = []
  ): Promise<ThinkingResult>
  
  validatePlan(plan: PlanStep[]): { valid: boolean; errors: string[] }
  
  formatForLog(result: ThinkingResult): string
}

interface ThinkingResult {
  thinking: string        // Internal reasoning (max 1000 words)
  plan: PlanStep[]        // Execution steps
  estimatedSteps: number
  reasoning: string
}

interface PlanStep {
  order: number
  action: string
  tool?: string
  args?: string[]
  rationale: string
  skipIfFails?: boolean
}
```

**How It Works:**
1. User sends request
2. Pensieve calls Ollama with system prompt designed for planning
3. AI returns JSON with thinking + detailed plan
4. Plan is validated for correctness
5. Returns to Agent for execution (thinking is hidden from user)

### 5. Skill Registry
**File:** `src/services/skillRegistry.ts`

Manages capabilities and knowledge skills (similar to Claude Code).

```typescript
class SkillRegistry {
  getSkill(name: string): Skill | undefined
  getCategory(category: string): SkillCategory | undefined
  getAllSkills(): Skill[]
  enableSkill(name: string): boolean
  disableSkill(name: string): boolean
  getSkillsFor(useCase: string): Skill[]
  formatForContext(): string
}

interface Skill {
  name: string              // e.g., "code-analysis"
  description: string
  category: 'code' | 'analysis' | 'execution' | 'knowledge' | 'creativity'
  enabled: boolean
  tools: string[]          // Tools it can use
}
```

**Categories:**
- **Code** - File editing, project structure
- **Execution** - Running commands, git operations
- **Analysis** - Debugging, code review
- **Knowledge** - Research, documentation
- **Creativity** - Writing, generation

**Note:** Skills enhance the system prompt to guide AI behavior.

### 6. Agent Executor
**File:** `src/services/agentExecutor.ts`

Executes planned steps autonomously.

```typescript
class AgentExecutor {
  async executePlan(steps: PlanStep[]): Promise<ExecutionReport>
  
  private async executeStep(step: PlanStep): Promise<ExecutionResult>
  
  getResults(): ExecutionResult[]
}

interface ExecutionReport {
  totalSteps: number
  successfulSteps: number
  failedSteps: number
  skippedSteps: number
  results: ExecutionResult[]
  totalTime: number
}
```

**Execution Flow:**
1. For each step in plan:
   - Log the planned action
   - Call the appropriate tool
   - Record result
   - Handle error if `skipIfFails` is true
2. Collect all results
3. Generate report with statistics

### 7. Main Agent Service
**File:** `src/services/agent.ts`

Orchestrates all components for autonomous operation.

```typescript
class Agent {
  async processRequest(userRequest: string): Promise<AgentResponse>
  
  getAvailableSkills(): Skill[]
  enableSkill(skillName: string): boolean
  disableSkill(skillName: string): boolean
  
  formatContext(): string  // System prompt + skills
}

interface AgentResponse {
  thinking: ThinkingResult
  execution: ExecutionReport
  summary: string
  autoExecuted: boolean
}
```

**Orchestration Steps:**
1. Add user request to context
2. Enter Pensieve mode (thinking)
   - Call `pensieve.think()` with system prompt
   - Show loading spinner while thinking
3. Display plan to user for transparency
4. Validate plan
5. Execute plan via `AgentExecutor`
6. Generate summary
7. Return to prompt

## Tool System

### Tool Interface
**File:** `src/tools/index.ts`

```typescript
interface Tool {
  name: string
  desc: string
  run(...args: string[]): ToolRes | Promise<ToolRes>
}

interface ToolRes {
  ok: boolean
  out: string      // Output
  err?: string     // Error message
  ms: number       // Execution time
}
```

### Available Tools

```
bash    - Execute commands        → Exec.cmd()
rf      - Read file               → Exec.read()
wf      - Write file              → Exec.write()
fe      - Edit file (advanced)    → fileEdit()
rep     - Replace in file         → Exec.rep()
add     - Add line                → Exec.add()
mkdir   - Create directory        → Exec.mkdir()
rmf     - Remove file             → Exec.rmf()
ls      - List directory          → Exec.ls()
git     - Git operations          → Exec.git()
ws      - Web search              → webSearch()
wf2     - Web fetch               → webFetch()
tc/tl/tu/tc2 - Task management   → task functions
```

## Design Patterns

### 1. Service Pattern
Each major component is a self-contained service:
- Ollama service for LLM
- Context service for state
- Session coordinator for tracking
- Pensieve for planning
- Agent Executor for action

### 2. Builder Pattern
Agent composes all services:
```typescript
const agent = new Agent(ollama, context, coordinator)
// Agent internally creates Pensieve, SkillRegistry, Executor
```

### 3. Strategy Pattern
Tool selection is strategic based on request:
- Pensieve determines which tools needed
- Skills indicate capabilities
- Executor runs them

### 4. Observer Pattern
Session coordinator observes operations:
- Records tools used
- Tracks files created/modified
- Logs errors and insights

## Extension Points

### Adding a New Skill

1. **Define the skill** in `SkillRegistry.initializeDefaultSkills()`:

```typescript
{
  name: 'my-skill',
  description: 'Does something cool',
  category: 'execution',
  enabled: true,
  tools: ['bash', 'wf']
}
```

2. **No code changes needed** - Skills work by influencing the system prompt

3. **Mention it in Pensieve system prompt** so the AI knows to use it

### Adding a New Tool

1. **Create tool file** in `src/tools/`:

```typescript
// src/tools/myTool.ts
export function myTool(arg1: string, arg2: string): ToolRes {
  // Implementation
  return { ok: true, out: 'result', err: '', ms: 10 }
}
```

2. **Register in tool index** (`src/tools/index.ts`):

```typescript
import { myTool } from './myTool.js'

export const TOOLS: Record<string, Tool> = {
  // ... existing tools
  mt: { 
    name: 'mt', 
    desc: 'my tool', 
    run(...args) { return myTool(...args) }
  }
}
```

3. **Update Pensieve system prompt** to inform AI about the new tool

4. **Add to SkillRegistry** if it's part of a skill category

### Customizing the System Prompt

Edit `Agent.formatContext()` to customize the AI instructions:

```typescript
formatContext(): string {
  return `
You are Sircode, an autonomous AI agent.
# Your skills:
${this.skillRegistry.formatForContext()}

# Your instructions:
...
  `
}
```

## Data Flow Examples

### Example 1: Create a File

```
User Input: "Create a TypeScript utility"
    ↓
Agent.processRequest()
    ↓
Pensieve.think()
    • AI plans: Step 1: Create file, Step 2: Add content
    • Returns ThinkingResult with plan
    ↓
Validate plan
    ↓
AgentExecutor.executePlan()
    • Step 1: runTool('fe', 'utils.ts', 'code...')
    • Step 2: runTool('fe', 'utils.ts', 'more code...')
    ↓
SessionCoordinator.recordFileOp('create', 'utils.ts')
    ↓
Return ExecutionReport
    ↓
Back to prompt
```

### Example 2: Debug an Error

```
User: "Fix this error: Cannot find module"
    ↓
Pensieve plans:
  1. Read error stack trace
  2. Search web for solution
  3. Apply fix
  4. Run tests
    ↓
Executor runs each tool
    ↓
Session logs what was changed
    ↓
Report shows success
```

## Performance Considerations

### Token Optimization
- Pensieve uses JSON for compact plan format
- Plans validated before execution (avoid wasted execution)
- Session context not sent on every call (kept locally)

### Time Optimization
- Streaming used where possible
- Tools execute in sequence (dependencies matter)
- Parallel execution not yet implemented (future)

### Memory Efficiency
- Session records stored to disk (`.code/`)
- Large contexts pruned periodically
- Tool results not kept in memory indefinitely

## Testing the System

### Build
```bash
npm run build
```

### Test Agent Mode
```bash
npm run dev
# Then in another terminal:
# sircode agent
```

### Debug Output
```bash
DEBUG_THINKING=1 sircode agent    # See thinking process
DEBUG_EXECUTION=1 sircode agent   # See execution details
```

### Session Analysis
```bash
sircode context                   # View aggregated stats
cat .code/sessions/*              # View raw session data
```

## Future Enhancements

1. **Multi-turn Planning** - Plans that adjust mid-execution
2. **Parallel Tool Execution** - Run independent steps in parallel
3. **Learning Systems** - Improve plans based on past results
4. **Skill Chaining** - Skills that use other skills
5. **Custom Models** - Support for fine-tuned models
6. **Advanced Reasoning** - Tree-of-thought style planning
7. **Collaborative Mode** - Multiple agents working together
8. **Streaming Plans** - Show plan as it's being generated

## Contributing

To contribute to the agent system:

1. Follow TypeScript strict mode
2. Add comprehensive JSDoc comments
3. Update tests and docs
4. Test with multiple Ollama models
5. Add your feature to SKILLS.md if relevant

---

**Happy extending! 🚀**
