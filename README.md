# Sircode 🚀

Sircode is an **Ollama-powered CLI coding assistant** inspired by the open-source Claude Code architecture. It brings local, privacy-first AI-assisted coding to your terminal using Ollama.

## Features

✨ **Interactive Chat Mode** - Have conversations with a local LLM about code and development  
🤖 **Autonomous Agent Mode** - Let AI think, plan, and execute tasks automatically without confirmation  
🛠️ **18+ Built-in Tools** - Execute bash, edit files, read with line numbers, search web, manage tasks  
🔒 **Privacy-First** - All data stays on your machine (uses local Ollama)  
⚡ **Fast & Lightweight** - Written in TypeScript, runs on Node.js/Bun  
📦 **Modular Architecture** - Easy to extend with new tools and services  
🎯 **Multiple Models** - Use any Ollama-compatible model (Mistral, Neural Chat, etc.)
💾 **Persistent Memory** - Saves session context to `.code/` directory with auto-compaction  
📊 **Session Tracking** - Records files created, tools used, errors, and insights
🌐 **Web Capabilities** - Fetch URLs and search the internet locally
🧠 **Pensieve Thinking** - Agent uses internal planning without showing intermediate thinking
🚀 **Small Model Boost** - Use `--small-model-mode` to supercharge 1B-8B models with prompt rewriting & multi-response validation

## Prerequisites

1. **Node.js** (v18+) or **Bun** installed
2. **Ollama** installed (Sircode will auto-start it if installed but not running):
   ```bash
   # Download from https://ollama.ai
   # Once installed, you don't need to run `ollama serve` manually - Sircode handles it!
   ```
3. **A model pulled** in Ollama (required once):
   ```bash
   ollama pull mistral    # or any other model
   ```
   Then you can use sircode from any terminal without additional setup.

> **💡 Tip:** First time using Ollama? It'll take a few seconds to start up. Sircode waits patiently!

## Installation

### Option 1: Automated Installation (Recommended)

**Linux/macOS:**
```bash
curl -sSL https://raw.githubusercontent.com/Sirco-web/Sircode/main/install.sh | bash
```

**Or with wget:**
```bash
wget -qO- https://raw.githubusercontent.com/Sirco-web/Sircode/main/install.sh | bash
```

The installer will:
- ✓ Install Node.js and npm (if needed)
- ✓ Install Ollama (if needed)
- ✓ Clone and build Sircode
- ✓ Show next steps

Then run for global access:
```bash
cd ~/.local/share/sircode
bash install-global.sh
```

Add to your shell profile:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Option 2: Manual Installation

```bash
# Clone the repository
git clone https://github.com/Sirco-web/Sircode.git
cd Sircode

# Run install script (installs Node.js, npm, Ollama if needed)
bash install.sh

# Make globally available
bash install-global.sh

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"
```

## Quick Start

### 1. Ollama (Auto-Starts!)

No need to manually start Ollama! Sircode will automatically detect and start Ollama if it's installed but not running.

**First time setup:**
```bash
ollama pull mistral    # Pull a model (required once)
```

**That's it!** Just use sircode - it handles the rest:

```bash
sircode chat          # Ollama auto-starts if needed
sircode chat neural-chat
```

If Ollama isn't installed, install it from https://ollama.ai first.

### 2. Use Sircode (Python Wrapper)

**From any directory** (after global installation):

```bash
# Interactive chat
sircode chat

# With specific model  
sircode chat neural-chat

# List available models
sircode models

# Single query
sircode exec "What is TypeScript?"

# View session context & memory
sircode context

# Update Sircode to latest version
sircode update
```

**Or use locally** (without global install):

```bash
cd /workspaces/Sircode
python code.py chat
python code.py models
python code.py exec "Your question"
```

## 🤖 Autonomous Agent Mode (NEW!)

New to Sircode: **Let the AI think and execute without confirmation!**

The agent mode enables true autonomous coding:

```bash
sircode agent               # Start autonomous agent
sircode agent neural-chat   # With specific model
```

### How It Differs from Chat Mode

| Aspect | Chat Mode | Agent Mode |
|--------|-----------|-----------|
| Flow | You → AI → You → AI → ... | You → AI thinks → executes → done |
| Planning | Responds to each message | Creates full plan first |
| Confirmation | Asks before major actions | Auto-executes plan |
| Skills | Basic | Full integrated skills |
| Best for | Learning, exploration | Automation, efficiency |

### Example Agent Session

```
You: Create a TypeScript utility for email validation

Agent thinks... (internal planning, not shown)

📋 Execution Plan:
  1. Create utils/email.ts with validation logic
  2. Add JSDoc comments  
  3. Create unit tests
  4. Run tests to verify

💭 Reasoning: Scaffolding a production-ready utility with tests and documentation.

🚀 Executing...
  ✓ Step 1: File created
  ✓ Step 2: Comments added
  ✓ Step 3: Tests created
  ✓ Step 4: All tests passing

✅ Complete! 3 files created in 2.3 seconds.
```

### Available Skills in Agent Mode

The agent automatically uses the most relevant skills:
- 🛠️ **Code Execution** - Create files, run commands, modify code
- 📚 **Knowledge** - Search web, fetch documentation
- 🔍 **Analysis** - Find bugs, analyze code quality
- ✅ **Management** - Create tasks, track progress
- ✨ **Creativity** - Generate docs, comments, tests

**18+ tools** available automatically! See [SKILLS.md](./SKILLS.md) for complete list.

### Thinking & Planning (Pensieve)

The agent uses "Pensieve mode" for internal thinking:
- Analyzes your request
- Creates a detailed execution plan
- Validates the plan
- Then executes without showing working
- Finally shows you the results

This makes interactions faster and more focused.

For full details, see [AGENT.md](./AGENT.md).

## � Distributed Architecture (Server Mode)
Sircode supports **distributed inference**: run Ollama on a GPU-powered server, code on your laptop, all connected over local network.

### How It Works

```bash
# On server machine (with GPU)
sircode server
# ✅ Sircode Server running on http://192.168.1.100:8093
# 🧠 GPU: CUDA - Driver: 545.29, Compute: 8.9

# On laptop (port auto-detected - no need to type it!)
sircode chat mistral --server 192.168.1.100
# 🌐 Connecting to server: http://192.168.1.100:8093
# ✓ Connected
# You: [chat here] → runs on remote GPU
```

### Features

✅ **Auto-GPU Detection** - NVIDIA CUDA, AMD ROCm, Apple Metal, CPU fallback  
✅ **Model Management** - Auto-pulls models on server if not available  
✅ **Network Streaming** - Streaming responses over HTTP  
✅ **Distributed** - Works across any local network  
✅ **Cross-Platform** - Windows, macOS, Linux compatible  

### Server Command

```bash
# Start server (listens on all network interfaces)
sircode server

# Custom port
sircode server --port 5000

# Verbose output
sircode server -v
```

### Client Connection

```bash
# Connect to remote server
sircode chat mistral --server 192.168.1.100:3000
sircode chat mistral --server 192.168.1.100  # Default port 3000
sircode chat mistral --server 192.168.1.100:5000

# Works with small model mode too
sircode chat phi --server 192.168.1.100:3000 --small-model-mode
```

### Server API

The server exposes REST endpoints for advanced integrations:

- `GET /health` - Health check + GPU info
- `GET /info` - Server information  
- `GET /models` - List available models
- `POST /chat` - Chat completion (supports streaming)
- `POST /models/pull` - Pull a new model (streaming progress)

Example curl:
```bash
curl -X POST http://192.168.1.100:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

## 💾 Memory & Context System
Sircode implements a **3-layer persistent memory system** inspired by Claude Code:

### What It Does

✅ **Saves everything** to `.code/` directory  
✅ **Auto-compacts context** at 70% usage  
✅ **Keeps important facts** (decisions, code, errors)  
✅ **Selective loading** (only recent + relevant)  
✅ **Perfect for small models** (1B-8B models work better with clean context)

### 3-Layer Architecture

```
Working Memory (last 5 messages)
        ↓
Context File (.code/context.md - summarized state)
        ↓
Long-Term Memory (.code/memory.md - important facts)
```

### Auto-Compaction

When context reaches 70% of token limit:
- Summarizes old messages
- Keeps last 5 messages exactly
- Preserves decisions and code snippets
- Automatically saves to `.code/`

### Example: Small Model Mode

```bash
# With auto-compaction and selective context
sircode chat phi --small-model-mode

# Automatically compacts when needed:
# Memory compacted (1x)
# Memory compacted (2x)
# ... keeps running cleanly
```

For complete documentation, see [MEMORY_SYSTEM.md](./MEMORY_SYSTEM.md).

## How It Works

The Python wrapper (`code.py`) bridges between user-friendly Python CLI and the powerful TypeScript backend:

1. **Captures your working directory** - When you run `sircode chat` from `~/my-project`, it remembers that location
2. **Delegates to TypeScript** - Passes the command to the compiled Node.js CLI
3. **Routes file operations** - All file creates/edits/reads happen in YOUR directory, not Sircode's
4. **Manages configuration** - Stores model/URL preferences in `~/.sircode/config.json`

**Example:**
```bash
cd ~/my-awesome-app
sircode exec "Create index.ts"
# → Creates ~/my-awesome-app/index.ts ✓
# (NOT /path/to/Sircode/index.ts)
```

## Tools Available

When chatting with the AI, it can use **18+ tools** to accomplish tasks:

### 🔧 Core Tools (9)
- **bash** - Execute shell commands
- **rf** (read_file) - Read file contents
- **wf** (write_file) - Write/create files
- **add** - Append to files
- **rep** (replace) - Find and replace in files
- **rmf** - Remove files/directories
- **mkdir** - Create directories
- **ls** - List directory contents
- **git** - Git operations

### 📚 Advanced File Tools (2)
- **fe** (file_edit) - Precise text replacement with multi-line support
  - Format: `[fe: path, old_text, new_text, replace_all?]`
  - Example: `[fe: app.ts, const api = 'old', const api = 'new']`
- **fr** (file_read) - Read with line numbers and offset/limit
  - Format: `[fr: path, offset?, limit?]`
  - Example: `[fr: package.json, 5, 10]` (read lines 5-15)

### 🌐 Web Tools (2)
- **wf2** (web_fetch) - Fetch and extract content from URLs
  - Format: `[wf2: url, prompt?]`
  - Example: `[wf2: https://docs.example.com, Extract API endpoint examples]`
- **ws** (web_search) - Search the web for information
  - Format: `[ws: query, max_results?]`
  - Example: `[ws: typescript performance tips, 5]`

### ✅ Task Management (4)
- **tc** (task_create) - Create a task to track work items
  - Format: `[tc: subject, description?]`
- **tl** (task_list) - List all current tasks
- **tu** (task_update) - Update task status
- **tc2** (task_complete) - Mark a task as done

### ❓ User Interaction (1)
- **ask** - Ask user a clarifying question
  - Format: `[ask: your question here]`
  - When used, the AI waits for your answer and continues with the task

## ⚡ Smart AI Behavior

Sircode's AI assistant is designed to **get things done**:

✅ **Continues Until Complete** - The AI won't stop after one response. It keeps working until your request is fully accomplished.

✅ **Asks for Clarification** - If the AI is unsure about your intent, it uses the `[ask: question]` tool to get your input, then continues.

✅ **Tracks Progress** - Uses tasks (`[tc:`, `[tl:`, `[tu:]`) to break complex work into trackable steps.

✅ **Reports Results** - Shows you exactly what each tool accomplished (files created, text replaced, web pages fetched, etc.)

### Example Interaction

```bash
You: Create a simple REST API with Express

AI: [tc: Set up Express project, Install express and create package.json]
AI: [bash: npm init -y && npm install express]
AI: ✓ Express installed

AI: [tc: Create server file, Create app.js with basic server]
AI: [wf: app.js, const express = require('express'); ...]
AI: ✓ app.js created

AI: [tc: Add sample route, Add GET /hello endpoint]
AI: [fe: app.js, module.exports, app.get('/hello', ...); module.exports]
AI: ✓ Route added

AI: [ask: Should I add a specific route like /api/users?]
You: Yes, add /api/users POST endpoint

AI: [fe: app.js, app.listen, app.post('/api/users', ...); app.listen]
AI: ✓ API route added

You can now run: node app.js
All tasks completed! 🎉
```

## Memory & Context

Sircode saves persistent session context to a `.code/` directory in your project:

```bash
my-project/
├── src/
├── index.html          # Your files
└── .code/              # ← Auto-created by Sircode
    ├── context.json    # Session metadata
    ├── memory.jsonl    # Event log
    └── metadata.json   # Statistics
```

### View Your Session

```bash
sircode context
```

Shows:
- Model used and files created/modified
- Tools executed and their success/failure
- Memory statistics for analysis
- Cumulative usage stats

For more details, see [MEMORY.md](MEMORY.md)

## Architecture

```
src/
├── cli.ts                 # Command-line interface & entry point
├── types/                 # TypeScript interfaces
├── services/
│   ├── ollama.ts         # Ollama API wrapper
│   ├── executor.ts       # Command & file execution
│   └── context.ts        # Conversation context management
├── tools/                 # Available tools (bash, file I/O, etc.)
├── utils/                 # Utility functions
└── index.ts              # Module exports
```

### Key Components

**Ollama** - Handles communication with Ollama API
- `ok()` - Verify connection
- `chat()` - Get response from model
- `stream()` - Stream long responses
- `ls()` - List available models
- `get()`, `set()` - Model parameter management

**Exec** - Executes commands and file operations
- `cmd()` - Run bash commands
- `read()` - Read file contents
- `write()` - Write to files
- `ls()` - List directory contents

**ContextService** - Manages conversation history
- `add()` - Add user/assistant message
- `get()` - Get all messages
- `forAPI()` - Get formatted messages for API calls
- `clear()` - Reset conversation

**Tools** - Executable tools in the system
- `bash` - Execute shell commands
- `rf` - Read file
- `wf` - Write file
- `ls` - List directory

## Development (Building from Source)

If you want to modify the TypeScript code or build from source:

### Build

```bash
npm run build
```

### Type Check

```bash
npm run type-check
```

### Run Directly

```bash
npm run dev chat
```

For more details on architecture and extending Sircode, see [CAVEMAN_REFACTOR.md](CAVEMAN_REFACTOR.md) and [PYTHON_CLI.md](PYTHON_CLI.md).

## Usage Examples

### Example 1: Chat with AI from Your Project

```bash
cd ~/my-project
sircode chat

# In chat:
You: Create a TypeScript function that validates email addresses
Sircode: Here's a function... [generates code]
You: Use it in an index.ts file
Sircode: [creates ~/my-project/index.ts]
```

### Example 2: Single Query

```bash
cd ~/nodejs-app
sircode exec -m neural-chat "Create a package.json for Express.js"
# → Creates ~/nodejs-app/package.json

cd ~/python-app
sircode exec "Write a FastAPI hello world server"
# → Creates files in ~/python-app/
```

### Example 3: Multiple Models

```bash
# Quick responses with a small model
sircode chat mistral

# Code generation with larger model
sircode chat neural-chat

# Check available models
sircode models
```

### Example 4: Custom Ollama URL

```bash
# Local network Ollama on another machine
sircode chat -u http://192.168.1.100:11434 mistral
```

## Supported Models

Sircode works with any Ollama-compatible model. Popular choices:

- **Mistral** (recommended, ~7B)
  ```bash
  ollama pull mistral
  ```

- **Neural Chat** (~7B, optimized for conversations)
  ```bash
  ollama pull neural-chat
  ```

- **Dolphin Mixtral** (~47B, very capable)
  ```bash
  ollama pull dolphin-mixtral
  ```

- **CodeLlama** (optimized for code)
  ```bash
  ollama pull codellama
  ```

- **Llama 2** (~7B, versatile)
  ```bash
  ollama pull llama2
  ```

To use a model:
```bash
python code.py chat neural-chat
```

## Extending Sircode

### Adding a New Tool

Edit `src/tools/index.ts`:

```typescript
export const MyNewTool: Tool = {
  name: 'my_tool',
  description: 'What this tool does',
  execute(...args: string[]): ToolResult {
    // Implementation
    return {
      success: true,
      output: 'Result here',
      executionTime: 42,
    }
  },
}

// Register it
export const TOOLS: Record<string, Tool> = {
  my_tool: MyNewTool,
  // ... other tools
}
```

### Custom System Prompt

```typescript
const context = new ContextService()
context.setSystemPrompt(`You are a Python expert assistant...`)
```

### Using Programmatically

```typescript
import { Ollama, ContextService } from './index.js'

const ollama = new Ollama('mistral')
const context = new ContextService()

context.add({ role: 'user', content: 'Hello!' })
const response = await ollama.chat(context.forAPI())
console.log(response)
```

## Troubleshooting

### "Cannot connect to Ollama"

Make sure Ollama is running:
```bash
ollama serve
```

Check if it's on a different address:
```bash
python code.py chat -u http://your-ip:11434
```

### Model Not Found

List available models:
```bash
python code.py models
```

Pull a model:
```bash
ollama pull mistral
```

### Performance Issues

- Use a smaller model (Mistral 7B is fast)
- Check available RAM and disk space
- Ensure GPU is being used (if available)

## Comparison with Claude Code

| Feature | Claude Code | Sircode |
|---------|------------|---------|
| API | Anthropic Claude | Local Ollama |
| Cost | Paid API calls | Free (local) |
| Privacy | Sent to cloud | Local only |
| Installation | Complex | Simple |
| Customization | Limited | Highly extensible |
| Model Choice | Fixed Claude | Any Ollama model |
| Scope | Full IDE integration | CLI-focused |

## License

MIT

## Credits

- Inspired by [Claude Code](https://github.com/yasasbanukaofficial/claude-code)
- Built on top of [Ollama](https://ollama.ai)
- CLI powered by [Commander.js](https://github.com/tj/commander.js)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## Roadmap

- [ ] Multi-turn conversation persistence
- [ ] Code completion suggestions
- [ ] Real-time file watching
- [ ] Integration with Git for context
- [ ] Plugin system
- [ ] Web UI version
- [ ] Docker container support

## Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review Ollama documentation

---

## 📚 Complete Command Reference

### Chat Mode Commands

```bash
# Basic chat
sircode chat
sircode chat mistral
sircode chat neural-chat

# Flags
sircode chat mistral --small-model-mode              # Enable prompt rewriting & multi-response validation
sircode chat mistral --server 192.168.1.100         # Connect to remote server (port auto-detected)
sircode chat mistral --server 192.168.1.100:5000   # Connect to remote server with custom port
sircode chat mistral -u http://custom:11434         # Use custom Ollama URL
sircode chat mistral -m neural-chat                 # Model option
```

### Agent Mode Commands

```bash
# Autonomous agent
sircode agent
sircode agent mistral
sircode agent neural-chat

# Flags: same as chat mode
sircode agent mistral --small-model-mode
sircode agent mistral --server 192.168.1.100
```

### Server Mode Commands

```bash
# Start server (listens on all network interfaces, port 8093)
sircode server

# Custom port
sircode server --port 5000
sircode server -p 5000

# Verbose output (shows requests, GPU info, model pulls)
sircode server -v
sircode server --verbose

# Custom host
sircode server --host 127.0.0.1          # Localhost only
sircode server --host 0.0.0.0 --port 8093
```

### Other Commands

```bash
# List available models
sircode models

# Single query/execution
sircode exec "Create a TypeScript utility"
sircode exec -m mistral "Your task here"

# View session context & memory
sircode context

# Update to latest version
sircode update

# Show help
sircode --help
sircode chat --help
sircode agent --help
sircode server --help
```

### All Flags Summary

| Flag | Short | Type | Used In | Description |
|------|-------|------|---------|-------------|
| `--small-model-mode` | - | boolean | chat, agent | Enable prompt rewriting & multi-response validation for small models |
| `--server` | - | string | chat, agent | Remote server address (auto-adds port 8093 if not specified) |
| `-u, --url` | - | string | chat, agent | Custom Ollama URL (default: http://localhost:11434) |
| `-m, --model` | - | string | chat, agent, exec | Model name (default: mistral) |
| `-p, --port` | - | number | server | Server port (default: 8093) |
| `--host` | - | string | server | Server host (default: 0.0.0.0) |
| `-v, --verbose` | - | boolean | server, chat | Show detailed output |
| `--help` | - | boolean | all | Show help message |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (CLI)                     │
│                     (src/cli.ts)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  chat [model]    │  agent [model]  │  server         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐
   │  Ollama     │   │  Exec       │   │  Server      │
   │  Service    │   │  Service    │   │  (Express)   │
   └─────────────┘   └─────────────┘   └──────────────┘
        │
        └──────────┬──────────┐
                   │          │
            ┌──────▼──┐  ┌───▼─────────────┐
            │   Chat  │  │   Agent         │
            │  Mode   │  │   Mode (new)    │
            └─────────┘  └─┬───────────────┘
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
   │  │ bash|rf|fe|wf|git|ws|wf2|ask|tasks│  │
   │  └────────────────────────────────────┘  │
   └──────────────────────────────────────────┘
```

### Core Services

**Ollama Service** - Handles all Ollama API communication
- Chat completion (streaming & non-streaming)
- Model listing and management
- Connection verification
- Timeout protection (10 minutes for large models)

**Context Service** - Maintains conversation context
- Adds and tracks messages
- Formats for API calls
- Auto-compaction at 70% tokens

**Session Coordinator** - Tracks all operations
- Records messages and tool calls
- Saves to `.code/` directory
- Tracks files created/modified
- Logs insights and errors

**Pensieve Service** (Agent Mode) - Internal thinking/planning
- Analyzes requests in silence
- Creates detailed execution plans
- Validates plans before execution
- Hides working from user

**Skill Registry** - Manages agent capabilities
- Code, Analysis, Knowledge, Execution, Creativity
- Tool bindings and availability
- Provides context to guide AI behavior

**GPU Detector** - Auto-detects GPU setup
- NVIDIA CUDA detection (any driver version)
- AMD ROCm support
- Apple Metal support
- CPU fallback

**Ollama Setup** (Auto-startup) - Manages Ollama lifecycle
- Checks if Ollama is installed
- Auto-downloads and installs (Linux/macOS)
- Auto-starts if not running
- Waits for readiness (30s timeout)

---

## 🤖 Agent Mode Deep Dive

### Three Execution Phases

**1. Pensieve (Silent Thinking)**
- AI analyzes your request internally
- Creates detailed execution plan
- Validates that plan is viable
- User doesn't see this phase

**2. Plan Presentation**
- Shows planned steps for transparency
- Displays reasoning behind plan
- User can review before execution starts
- Automatic execution without confirmation

**3. Auto-Execution**
- Executes steps sequentially
- Handles errors gracefully
- Reports real-time progress
- Generates completion report

### Available Skills

**Code Execution**
- bash-execution: Run commands and scripts
- file-editing: Create/modify files with precision
- directory-management: Create and organize folders
- git-integration: Version control operations

**Knowledge & Research**
- web-search: Search internet for information
- web-fetch: Extract content from URLs
- knowledge-base: Query persistent knowledge

**Task & Project Management**
- task-management: Create and track tasks
- project-planning: Break down features into steps

**Analysis & Creativity**
- code-analysis: Review code for issues
- creative-writing: Generate docs and comments
- debugging: Find and fix bugs
- problem-solving: Break down complex tasks

**18+ total tools** available automatically!

### Example Agent Sessions

**Creating a Feature**
```
You: Create a React component for user profile card

Agent Thinks...
Plan: 1) Create component 2) Add styles 3) Write tests 4) Document

Executing...
✓ Component created
✓ Tailwind styles added
✓ Unit tests passed
✓ JSDoc added

4/4 steps successful in 3.2s
```

**Debugging an Issue**
```
You: Fix null reference error in login handler

Agent Thinks...
Plan: 1) Read function 2) Run tests 3) Add guards 4) Verify

Executing...
✓ Function read
✓ Tests show 3 failures
✓ Null checks added
✓ All tests passing

5/5 steps successful
```

---

## 💾 Memory & Context System

### 3-Layer Architecture

```
Working Memory (last 5 messages - never summarized)
        ↓
Context Layer (.code/context.md - summarized state)
        ↓
Long-Term Memory (.code/memory.md - key facts)
```

### Auto-Compaction Process

When context reaches 70% of token limit:
- Summarizes messages older than last 5
- Preserves decisions and code examples
- Extracts important facts
- Saves to `.code/` directory
- Continues with clean context

### What Gets Saved

| File | Contains | Updated | Purpose |
|------|----------|---------|---------|
| `.code/context.md` | Current state summary | Each compaction | Quick session overview |
| `.code/memory.md` | Important facts & decisions | Each compaction | Long-term knowledge |
| `.code/history.log` | Full raw chat | Each message | Complete audit trail |
| `.code/tasks.md` | Current task list | When tasks change | Track progress |

### Benefits for Small Models

Without memory system:
- Context bloats → 4000+ tokens
- Model gets confused
- More hallucinations
- Slower responses

With memory system:
- Context stays lean → 500-600 tokens
- Only relevant info included
- Better reasoning and accuracy
- Faster responses

**Result:** 1B-8B models perform like much larger models!

### Manual Commands

```bash
sircode context                 # View session data
cat .code/history.log          # See full chat history
cat .code/memory.md            # View long-term facts
cat .code/context.md           # See current state
rm -rf .code/                  # Clear memory (restart fresh)
```

---

## 🌐 Distributed/Server Architecture

### Perfect For

- 💻 Laptop + Desktop setups
- 🏠 Home networks
- 🏢 Small office networks
- 🔧 Shared GPU resources
- 🔒 Privacy-first teams

### GPU Auto-Detection

**NVIDIA CUDA**
- Works on Windows, macOS, Linux
- Any NVIDIA GPU
- Auto-detects driver version
- Sets optimal performance flags

**AMD ROCm**
- Works on Linux
- Any AMD GPU with ROCm
- Enables Radeon acceleration

**Apple Metal**
- Works on macOS
- All Apple Silicon Macs
- Native GPU acceleration

**CPU Fallback**
- Works on any machine
- Slower but always available
- Auto-selected if no GPU found

### Server Setup

```bash
# On GPU machine
sircode server

# Server auto-detects GPU and starts on port 8093
# Listens on all network interfaces (0.0.0.0)
```

### Client Connection

```bash
# From any machine on the network
sircode chat mistral --server 192.168.1.100

# Auto-adds port 8093 if not specified
# Or with custom port if needed
sircode chat mistral --server 192.168.1.100:5000
```

### Model Auto-Pull

When you request a model not on the server:
- Server auto-downloads it
- Pulls happen in background
- User sees "Model ready" when complete
- No manual setup needed

### Server REST API

- `GET /health` - Health check + GPU info
- `GET /info` - Server details (OS, memory, GPU)
- `GET /models` - List available models
- `POST /chat` - Chat completion (supports streaming)
- `POST /models/pull` - Pull a new model (streaming)

Example:
```bash
curl -X POST http://192.168.1.100:8093/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

---

## 🧠 Small Model Optimization

### What It Does

`--small-model-mode` enables special handling for small models (1B-8B parameters):

1. **Prompt Rewriting**
   - Simplifies complex requests
   - Provides more structure
   - Breaks down multi-part queries

2. **Task Classification**
   - Identifies what kind of task it is
   - Routes to appropriate strategy
   - Pre-warms context

3. **Multi-Response Voting**
   - Generates 3 responses for critical tasks
   - Validates each against criteria
   - Returns highest-quality response

4. **Response Validation**
   - Checks for hallucinations
   - Verifies code syntax
   - Ensures relevance to question
   - 8-point validation rubric

5. **Selective Context Loading**
   - Only loads relevant history
   - Not full conversation
   - Works with memory compaction
   - Keeps tokens lean

### Usage

```bash
# Small model with optimizations enabled
sircode chat phi --small-model-mode

# Works with server too
sircode chat phi --server 192.168.1.100 --small-model-mode

# Works with agent mode
sircode agent mistral --small-model-mode
```

### Results

- **phi-2** (2.7B) → performs like 13B model
- **mistral-7B** → performs significantly better with less hallucination
- **neural-chat-7B** → more accurate code generation
- Works best with models 1B-8B range

---

## 🛠️ Tools & Capabilities

### File Operation Tools

**bash** - Execute shell commands
```bash
sircode exec "bash: npm install"
```

**rf (read_file)** - Read file contents
```bash
sircode exec "rf: src/app.ts, 1, 50"  # Lines 1-50
```

**wf (write_file)** - Write/create files
```bash
sircode exec "wf: index.ts, console.log('hello')"
```

**fe (file_edit)** - Precise multi-line editing
```bash
sircode exec "fe: app.ts, old_text, new_text"
```

**git** - Version control operations
```bash
sircode exec "git: add . && git commit -m 'Initial commit'"
```

### Web Tools

**ws (web_search)** - Search the internet
```bash
sircode exec "ws: TypeScript best practices, 5"
```

**wf2 (web_fetch)** - Extract URL content
```bash
sircode exec "wf2: https://docs.example.com, Extract API examples"
```

### Task Management

**tc (task_create)** - Create a task
```
[tc: Feature name, Description]
```

**tl (task_list)** - List all tasks
```
[tl:]
```

**tu (task_update)** - Update task status
```
[tu: task_id, status]
```

**tc2 (task_complete)** - Mark task done
```
[tc2: task_id]
```

### User Interaction

**ask** - Ask user clarifying questions
```
[ask: Your question here?]
```

---

**Happy coding! 🚀**