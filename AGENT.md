# Sircode Autonomous Agent Mode 🤖

The autonomous agent mode transforms Sircode into a self-thinking, self-planning, and self-executing AI coding assistant. Unlike the chat mode where you interact back-and-forth, the agent mode analyzes your request, creates a detailed plan, and executes it completely **without asking for confirmation**.

## Quick Start

```bash
# Start agent mode with default model (mistral)
sircode agent

# Or specify a model
sircode agent neural-chat
sircode agent dolphin
```

## How It Works

### The Three Phases

```
┌─────────────┐
│   Request   │  "Create an email validator"
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  📖 PENSIEVE (Internal Thinking)    │
│  ─────────────────────────────────  │
│  • Analyzes the request             │
│  • Evaluates available skills       │
│  • Creates detailed execution plan  │
│  • Estimates steps and complexity   │
│  • (User doesn't see this)          │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  📋 PLAN PRESENTATION               │
│  ─────────────────────────────────  │
│  • Shows the planned steps          │
│  • Displays reasoning               │
│  • User can see what will happen    │
│  • (User sees this for transparency)│
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  🚀 AUTO-EXECUTION                  │
│  ─────────────────────────────────  │
│  • Executes plan step by step       │
│  • Handles errors gracefully        │
│  • No user intervention needed      │
│  • Reports progress in real-time    │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  ✅ COMPLETION REPORT               │
│  ──────────────────────────────────  │
│  • What succeeded                   │
│  • What failed                      │
│  • Time taken                       │
│  • Files created/modified           │
└──────────────────────────────────────┘
```

## Key Features

### 🧠 Autonomous Thinking
- The agent doesn't show its internal reasoning
- It uses "Pensieve mode" to plan silently with advanced planning
- Plans are validated before execution
- Prevents token waste on unnecessary output

### ⚡ No Wait-for-Confirmation
- Once the plan is ready, execution starts immediately
- No "Do you want me to proceed?" messages
- Faster task completion
- More efficient workflows

### 🛠️ Integrated Skills System
The agent has access to powerful skills:
- **Code Execution** - Create and modify files, run commands
- **Knowledge** - Search the web, fetch documentation
- **Analysis** - Find bugs, analyze code quality
- **Project Management** - Create tasks, track progress
- **Creativity** - Generate documentation, comments

See [SKILLS.md](./SKILLS.md) for the complete list.

### 📊 Detailed Reporting
Each execution produces a report showing:
- Number of steps executed
- Success/failure statistics
- Time taken
- Files created and modified
- Session metadata in `.code/`

## Example Sessions

### Example 1: Creating a Feature

```bash
$ sircode agent
🤖 Sircode Agent: mistral
✓ OK
📚 Available Skills:
  • bash-execution: Execute bash commands and scripts
  • file-editing: Create, read, and modify files with precision
  ... and 18 more
Session: 1702418923456-a7f3k2

Agent: Create a React component for a user profile card

📖 Thinking and planning...
Planning complete (4 steps)

📋 Execution Plan:
  1. Create the React component file
     [fe] Add component structure with TypeScript
  2. Add styling with Tailwind classes
     [wf] Create component styles
  3. Write unit tests
     [wf] Add test file
  4. Update documentation
     [fe] Add JSDoc comments

💭 Reasoning: Component creation requires scaffolding, styling, testing, and documentation. This plan follows React best practices.

Starting autonomous execution...

🚀 Executing Plan...

  ▶ Step 1: Create the React component file
    Tool: fe (component.tsx)
  ✓ Step 1: SUCCESS
    Output: Component file created with proper TypeScript types...

  ▶ Step 2: Add styling with Tailwind classes
    Tool: wf (styles)
  ✓ Step 2: SUCCESS
    Output: Styling added with responsive design...

  ▶ Step 3: Write unit tests
    Tool: wf (component.test.tsx)
  ✓ Step 3: SUCCESS
    Output: Basic unit tests created...

  ▶ Step 4: Update documentation
    Tool: fe (component.tsx)
  ✓ Step 4: SUCCESS
    Output: JSDoc comments added...

📊 Execution Report:

  ✓ Successful: 4/4
  ✗ Failed: 0/4
  ⊘ Skipped: 0/4
  ⏱ Total time: 3.24s

✅ Autonomous execution complete!

Plan had 4 steps
Executed 4 steps successfully

Agent: 
```

### Example 2: Debugging an Issue

```bash
Agent: Fix this function that's not handling null values properly

📖 Thinking and planning...
Planning complete (5 steps)

📋 Execution Plan:
  1. Read the existing function
     [fr] Analyze current implementation
  2. Identify null handling gaps
     [bash] Run tests to see failures
  3. Add null checks
     [fe] Update function with guards
  4. Add TypeScript non-null assertions if needed
     [fe] Add type safety
  5. Verify tests pass
     [bash] Run test suite

💭 Reasoning: Systematic debugging approach identifying the issue first, then implementing type-safe fixes, finally verifying with tests.

🚀 Executing Plan...

  ✓ Step 1: SUCCESS
  ✓ Step 2: SUCCESS - Found 3 null-check scenarios
  ✓ Step 3: SUCCESS - Added defensive checks
  ✓ Step 4: SUCCESS - Types secured
  ✓ Step 5: SUCCESS - All tests passing

📊 Execution Report:
  ✓ Successful: 5/5
  ✗ Failed: 0/5
```

### Example 3: Project Setup

```bash
Agent: Set up a new TypeScript Node.js project with Express

📖 Thinking and planning...
Planning complete (8 steps)

📋 Execution Plan:
  1. Create project folders
  2. Initialize npm project
  3. Install Express and dependencies
  4. Create tsconfig.json
  5. Create main server file
  6. Add development scripts
  7. Create example routes
  8. Add README

💭 Reasoning: Scaffolding a production-ready Express project with proper TypeScript setup.

🚀 Executing Plan...
  ✓ Step 1-8: All completed successfully
  
📊 Execution Report:
  ✓ Successful: 8/8
  ✗ Failed: 0/8
  ⏱ Total time: 5.87s
```

## Commands in Agent Mode

### User Input

```
You: <your request>
```

Any natural language request. Examples:
- "Generate a TypeScript utility for formatting dates"
- "Fix this bug in the login handler"
- "Create an API endpoint for user authentication"
- "Add comprehensive error handling to this file"

### Special Commands

```
Agent: help
```
Shows available commands and examples

```
Agent: skills
```
Lists all 18+ available skills with descriptions

```
Agent: exit
```
Exit agent mode and return to terminal

## Execution Flow Visualization

```
Input Request
     │
     ▼
Parse Intent (what category?)
     │
     ├─────────────────────────────────────┐
     │                                     │
     ▼                                     ▼
Thinking Mode (silent)                 Load Skills
     │                                     │
     ├─Show Plan←──────────────────────────┤
     │                                     │
     ▼                                     ▼
Plan Validation                        Tool Selection
     │                                     │
     ├─Validate Steps←──────────────────── ┘
     │
     ▼
Execute Step 1
     │
     ├─Tool Call 1
     │     │
     │     ├─Output
     │     │
     │     └─Next Step?
     │
     ▼
Execute Step 2... N
     │
     ▼
Generate Report
     │
     ▼
Return to Prompt
```

## Configuration & Debugging

### Debug Mode

See detailed step-by-step execution:

```bash
DEBUG_EXECUTION=1 sircode agent
```

This will show:
- Each step's thinking process
- Tool inputs and outputs
- Error handling details
- Performance metrics

### Session Tracking

All agent sessions are automatically logged to `.code/sessions/`:

```
.code/
├── sessions/
│   ├── 1702418923456-a7f3k2.json  # Session metadata
│   └── MEMORY.md                  # Accumulated knowledge
├── files_created.txt
└── files_modified.txt
```

View session context:

```bash
sircode context
```

## Pro Tips

### 1. Be Specific
❌ Bad: "Make this better"  
✅ Good: "Refactor this function to extract the address validation into a separate utility"

### 2. Provide Context
❌ Bad: "Fix the error"  
✅ Good: "Fix this TypeError: Cannot read property 'name' of undefined"

### 3. One Task at a Time
❌ Bad: "Rewrite the entire API and add tests and fix the database"  
✅ Good: "Rewrite the user authentication endpoint" (then ask for tests separately)

### 4. Leverage Skills
✅ "Research best practices for GraphQL API design and implement one endpoint"  
✅ "Search for TypeScript type guards and add them to this function"  
✅ "Create a task list for this project"

### 5. Trust the Process
The agent will:
- Break down complex tasks automatically
- Use appropriate tools for each step
- Handle errors gracefully
- Provide detailed feedback

## Session Persistence

Every agent session is saved with:

- **Metadata** - Request, plan, execution time
- **Files** - What was created/modified
- **Tools** - Which tools were used
- **Errors** - Any issues encountered
- **Insights** - Learning for future sessions

Use `sircode context` to view aggregated session data.

## Limitations & Considerations

1. **File I/O** - All operations are in the current directory and subdirectories
2. **Execution Time** - Large operations may take several minutes
3. **Model Selection** - More capable models (mistral, neural-chat) work better
4. **Internet** - Web search/fetch skills require internet access
5. **Output** - Make sure terminal can handle output (not all terminals support colored output)

## Comparison: Chat vs Agent Mode

| Feature | Chat Mode | Agent Mode |
|---------|-----------|-----------|
| Interaction | Multi-turn dialog | Set-and-forget |
| Planning | Request-by-request | Full plan upfront |
| Confirmation | Asks before major changes | Auto-executes |
| Best for | Exploration, learning | Automation, efficiency |
| Skill usage | Limited | Full integration |
| Session tracking | Basic | Detailed |

## Troubleshooting

### "Agent failed: Ollama not responding"
- Make sure Ollama is running: `ollama serve`
- Default: http://localhost:11434
- Specify URL: `sircode agent --url http://ollama:11434`

### "Tool not found" errors
- Some tools may not be available on all systems
- Use `sircode agent` then `skills` to see what's available
- File operations work on all platforms

### "Plan looks wrong"
- The agent may misunderstand vague requests
- Be more specific about what you want
- Use the `help` command to see examples

### "Execution stopped at step X"
- Check `.code/` directory for error logs
- Some steps may have `skipIfFails: true` and continue
- Later steps might depend on earlier ones succeeding

## FAQ

**Q: Will the agent modify my files without backing them up?**  
A: Solid "yes" - always use version control (git). Session logs are saved to `.code/` for debugging.

**Q: Can I stop execution mid-plan?**  
A: Press Ctrl+C to interrupt. Partial results are still logged.

**Q: Does the agent learn from mistakes?**  
A: Currently plans are one-shot. Future versions will have multi-turn planning.

**Q: What's the maximum plan size?**  
A: Typically 5-20 steps per plan. Complex tasks might need multiple agent runs.

**Q: Can I create custom skills?**  
A: Yes! Edit `src/services/skillRegistry.ts` to add your own skills.

---

**Happy autonomous coding! 🚀**

For more info, see [SKILLS.md](./SKILLS.md) or run `sircode agent` then `help`.
