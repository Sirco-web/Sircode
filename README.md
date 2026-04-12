# Sircode 🚀

Sircode is an **Ollama-powered CLI coding assistant** inspired by the open-source Claude Code architecture. It brings local, privacy-first AI-assisted coding to your terminal using Ollama.

## Features

✨ **Interactive Chat Mode** - Have conversations with a local LLM about code and development  
🛠️ **Built-in Tools** - Execute bash commands, read/write files, list directories  
🔒 **Privacy-First** - All data stays on your machine (uses local Ollama)  
⚡ **Fast & Lightweight** - Written in TypeScript, runs on Node.js/Bun  
📦 **Modular Architecture** - Easy to extend with new tools and services  
🎯 **Multiple Models** - Use any Ollama-compatible model (Mistral, Neural Chat, etc.)

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

```bash
# Clone the repository
git clone https://github.com/Sirco-web/Sircode.git
cd Sircode

# Install dependencies
npm install
# or with Bun
bun install
```

## Quick Start

### 1. Start Ollama (in a separate terminal)

```bash
ollama serve
```

### 2. Use Sircode

```bash
# Interactive chat (recommended)
python code.py chat

# With specific model
python code.py chat neural-chat

# List available models
python code.py models

# Single query
python code.py exec "What is TypeScript?"
```

## Commands

### Chat Mode
```bash
python code.py chat [MODEL]

Options:
  -m, --model <model>  Specific model (default: mistral)
  -u, --url <url>      Ollama API URL (default: http://localhost:11434)
```

**In chat:**
- Type to chat with the AI
- `exit` - Quit
- `clear` - Clear history
- `models` - List available models

### List Models
```bash
python code.py models [-u URL]
```

### Execute Query
```bash
python code.py exec "Your question" [-m MODEL] [-u URL]
```

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

### Example 1: Get Help with Code

```
You: How do I create a TypeScript function that reads a JSON file?

Sircode: Here's a simple example...
```

### Example 2: Execute Commands

```
You: What files are in the current directory?
[The assistant might suggest: list_dir: .]

Sircode: ✓ Tool: list_dir (45ms)
Output: [lists directory contents]
```

### Example 3: File Operations

```
You: Create a simple index.ts file with a hello world function

Sircode: [Creates the file]
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