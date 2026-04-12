# Contributing to Sircode

Thanks for your interest in contributing to Sircode! We welcome contributions from everyone.

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Sircode.git
   cd Sircode
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Ollama**
   ```bash
   # Install from https://ollama.ai
   ollama serve
   
   # In another terminal
   ollama pull mistral
   ```

4. **Run Tests/Dev**
   ```bash
   npm run dev chat
   npm run type-check
   npm run build
   ```

## Development Workflow

### Branch Naming

- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`

Example: `feature/add-git-integration`

### Commit Messages

Use conventional commits:

```
feat: add GitHub integration tool
fix: handle ENOENT error in file operations
docs: update architecture guide
chore: update dependencies
test: add unit tests for executor
```

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Run type-check before committing: `npm run type-check`
- Format with default prettier settings

### Testing

Before submitting:

```bash
npm run type-check   # Type checking
npm run build        # Build verification
```

## Adding Features

### New Tool

1. Edit `src/tools/index.ts`
2. Implement `Tool` interface
3. Add to `TOOLS` registry
4. Test with: `npm run dev chat`
5. Document in README.md

Example:
```typescript
export const GitTool: Tool = {
  name: 'git',
  description: 'Execute git commands',
  execute(...args: string[]): ToolResult {
    const cmd = args.join(' ')
    return ExecutorService.executeCommand(`git ${cmd}`)
  }
}
```

### New Service

1. Create `src/services/myservice.ts`
2. Export main class
3. Add to `src/index.ts` exports
4. Document usage in ARCHITECTURE.md

### New Command

1. Edit `src/cli.ts`
2. Add command with `program.command()`
3. Implement action handler
4. Test with: `npm run dev [command]`

## Pull Request Process

1. **Create descriptive title**: "Add Git integration tool"
2. **Fill PR template** with:
   - What changes
   - Why it's needed
   - How to test
3. **Reference issues**: "Fixes #123"
4. **Keep focused**: One feature per PR when possible
5. **Update docs**: README, ARCHITECTURE, etc.

## Bug Reports

Include:

- Ollama version
- Model used
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

Example:
```
Ollama: 0.14.0
Model: mistral
Steps:
1. Run `npm run dev chat`
2. Type "list_dir: /nonexistent"
3. App crashes

Expected: Error message
Actual: Unhandled exception
```

## Documentation

- Update [README.md](README.md) for user-facing changes
- Update [ARCHITECTURE.md](ARCHITECTURE.md) for design changes
- Add comments to complex code
- Include examples for new features

## Project Structure Changes

If you add/remove/move files:
1. Update file tree in ARCHITECTURE.md
2. Update imports in affected files
3. Run type-check to verify

## Performance

When adding features:
- Measure execution time
- Return `ToolResult.executionTime`
- Avoid blocking operations
- Consider streaming for long outputs

## Security

- Validate user input
- Escape command arguments
- Don't expose sensitive data
- Review file operation paths

## Discussions

For larger changes:
1. Open an issue first
2. Discuss approach
3. Get feedback before coding
4. Then submit PR

## Code Review

- Be responsive to feedback
- Discuss disagreements respectfully
- Update PR based on comments
- Ensure all checks pass

## Requirements

- TypeScript strict mode compliance
- No external ML/LLM libraries
- Works with Node.js 18+
- Type definitions for all public APIs
- Backwards compatibility where possible

## Questions?

- Check [ARCHITECTURE.md](ARCHITECTURE.md)
- Review existing code
- Open a discussion issue

---

**Happy coding! 🚀**
