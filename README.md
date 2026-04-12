# Sircode 🚀

Sircode is an **Ollama-powered CLI coding assistant** inspired by the open-source Claude Code architecture. It brings local, privacy-first AI-assisted coding to your terminal using Ollama.

## Features

✨ **Interactive Chat Mode** - Have conversations with a local LLM about code and development  
🛠️ **Built-in Tools** - Execute bash commands, read/write files, list directories  
🔒 **Privacy-First** - All data stays on your machine (uses local Ollama)  
⚡ **Fast & Lightweight** - Written in TypeScript, runs on Node.js/Bun  
📦 **Modular Architecture** - Easy to extend with new tools and services  
🎯 **Multiple Models** - Use any Ollama-compatible model (Mistral, Neural Chat, etc.)
💾 **Persistent Memory** - Saves session context to `.code/` directory
📊 **Session Tracking** - Records files created, tools used, errors, and insights

## Prerequisites

1. **Node.js** (v18+) or **Bun** installed
2. **Ollama** running locally:
   ```bash
   # Download from https://ollama.ai
   ollama serve
   ```
3. **A model pulled** in Ollama:
   ```bash
   ollama pull mistral    # or any other model
   ```

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

### 1. Start Ollama (in a separate terminal)

```bash
ollama serve
ollama pull mistral  # or another model
```

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

When chatting with the AI, it can use these tools:

- **bash** - Execute shell commands
- **rf** (read_file) - Read file contents
- **wf** (write_file) - Write/create files
- **add** - Append to files
- **rep** (replace) - Find and replace in files
- **rmf** - Remove files/directories
- **mkdir** - Create directories
- **ls** - List directory contents
- **git** - Git operations

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

**Happy coding! 🚀**