# Sircode Agent Skills

The Sircode autonomous agent is equipped with multiple skills across different categories. These skills enable the agent to perform complex tasks automatically without requiring user confirmation.

## 🎯 Code Execution Skills

### bash-execution
**Description:** Execute bash commands and scripts  
**Tools:** `bash`  
**Use Cases:**
- Running scripts and commands
- Testing applications
- Building projects
- Managing processes

**Example:**
```
"Run the test suite for this project"
"Compile the TypeScript code and show me errors"
"Start a local development server"
```

### file-editing
**Description:** Create, read, and modify files with precision  
**Tools:** `fe` (advanced edit), `wf` (write), `fr` (read)  
**Use Cases:**
- Creating new files
- Modifying existing code
- Adding documentation
- Refactoring code

**Example:**
```
"Create a new utility function in src/utils.ts"
"Update the copyright year in all header comments"
"Add error handling to this function"
```

### directory-management
**Description:** Create, list, and manage directories  
**Tools:** `mkdir`, `ls`, `rmf`  
**Use Cases:**
- Project scaffolding
- Folder organization
- Cleanup operations

**Example:**
```
"Create a new project structure with src, tests, and docs folders"
"Remove the dist directory and rebuild"
```

### git-integration
**Description:** Git operations like commit, push, branch management  
**Tools:** `git`  
**Use Cases:**
- Version control operations
- Branch management
- Commit tracking
- Collaboration

**Example:**
```
"Create a new branch for this feature and stage all changes"
"Commit these changes with a meaningful message"
```

## 📚 Knowledge & Research Skills

### web-search
**Description:** Search the internet for information  
**Tools:** `ws`  
**Use Cases:**
- Research
- Finding solutions
- Gathering information
- Learning

**Example:**
```
"Search for the best practices for WebSocket implementation"
"Find npm packages for data validation"
```

### web-fetch
**Description:** Fetch and analyze web page content  
**Tools:** `wf2`  
**Use Cases:**
- Content extraction
- API documentation analysis
- Downloading resources

**Example:**
```
"Fetch the documentation from this URL and summarize"
```

### knowledge-base
**Description:** Query persistent knowledge base and context  
**Tools:** `kb`  
**Use Cases:**
- Accessing historical context
- Finding previous solutions
- Learning from past work

## ✅ Task & Project Management

### task-management
**Description:** Create, track, and update project tasks  
**Tools:** `tc` (create), `tl` (list), `tu` (update), `tc2` (complete)  
**Use Cases:**
- Project planning
- Task tracking
- Progress monitoring
- Deadline management

**Example:**
```
"Create a task list for implementing authentication"
"Mark the database migration task as complete"
"Show me all remaining tasks"
```

### project-planning
**Description:** Analyze projects and create execution plans  
**Tools:** `tc`, `tl`  
**Use Cases:**
- Project analysis
- Resource planning
- Risk assessment
- Timeline estimation

**Example:**
```
"Create a plan for adding a payment system to this app"
"Break down this feature into tasks"
```

## 🔍 Analysis & Creativity

### code-analysis
**Description:** Analyze code for patterns, issues, and improvements  
**Tools:** `fr` (read), `bash`  
**Use Cases:**
- Code review
- Issue detection
- Performance analysis
- Security scanning

**Example:**
```
"Analyze this function for performance issues"
"Check for memory leaks in this code"
"Review this component for accessibility issues"
```

### problem-solving
**Description:** Break down complex problems into steps  
**Tools:** (no specific tools)  
**Use Cases:**
- Algorithm design
- System architecture
- Decision making
- Troubleshooting

**Example:**
```
"How do I implement real-time notifications?"
"What's the best way to handle this edge case?"
```

### creative-writing
**Description:** Generate documentation, comments, and creative content  
**Tools:** `wf` (write)  
**Use Cases:**
- Documentation generation
- Code commenting
- README creation
- Technical writing

**Example:**
```
"Generate comprehensive JSDoc comments for this file"
"Create a README.md for this project"
"Write unit test documentation"
```

### debugging
**Description:** Identify and fix bugs in code  
**Tools:** `fr` (read), `fe` (edit), `bash`  
**Use Cases:**
- Bug fixing
- Error diagnosis
- Regression testing
- Issue resolution

**Example:**
```
"Debug this JavaScript error: [error message]"
"Fix this test that's failing"
"Find what's causing the memory leak"
```

### refactoring
**Description:** Improve code quality and structure  
**Tools:** `fr` (read), `fe` (edit)  
**Use Cases:**
- Code quality improvement
- Structure optimization
- Pattern application
- Technical debt reduction

**Example:**
```
"Refactor this function to be more readable"
"Extract these repeated patterns into a shared utility"
"Modernize this code to use latest JavaScript features"
```

## 🚀 How the Agent Selects Skills

The agent automatically evaluates your request and:

1. **Identifies required skills** based on request type
2. **Creates an execution plan** with specific steps
3. **Uses appropriate tools** from available skills
4. **Handles errors gracefully** with fallback strategies
5. **Executes autonomously** without asking for confirmation

## 📝 Example Usage

### Code Generation Task
```
Human: "Create a TypeScript utility function that validates email addresses"

Agent Process:
1. [Thinking] Analyzes the request
2. [Planning] 
   - Step 1: Create new file src/utils/email.ts
   - Step 2: Write validation logic
   - Step 3: Add unit tests
3. [Execution] Runs all steps automatically
4. [Results] Shows what was created and tested
```

### Debugging Task
```
Human: "Fix this TypeScript error: Cannot find name 'React'"

Agent Process:
1. [Thinking] Understands the issue
2. [Planning]
   - Step 1: Check imports in the file
   - Step 2: Look for React installation
   - Step 3: Add missing import
   - Step 4: Verify the fix
3. [Execution] Applies all fixes
4. [Results] Shows the fixed code and verification
```

### Project Setup Task
```
Human: "Set up a new Express API project with TypeScript"

Agent Process:
1. [Thinking] Plans the project structure
2. [Planning]
   - Step 1: Create project folders
   - Step 2: Initialize npm
   - Step 3: Install dependencies
   - Step 4: Create initial files
   - Step 5: Set up build scripts
3. [Execution] Builds complete project
4. [Results] Ready-to-use project structure
```

## ⚙️ Enabling/Disabling Skills

You can access agent commands in agent mode:

```
sircode agent              # Start agent mode

In agent mode:
  skills                   # List all available skills
  help                     # Show help
  exit                     # Leave
```

## 🔗 Integration with Tools

Each skill combines multiple tools to accomplish tasks:

- **Code skills** use file editing and bash tools
- **Knowledge skills** use web search and fetch tools
- **Management skills** use task and git tools
- **Analysis skills** use file reading and bash tools

## 💡 Best Practices

1. **Be specific** - "Add error handling" is better than "Fix the code"
2. **Provide context** - "Update the login validation" is better than "Change this"
3. **Let it plan** - The agent will break down complex tasks automatically
4. **Trust the process** - Plans are validated before execution
5. **Check results** - Review what was created in `.code/` directory

## 🔐 Safety & Limitations

- The agent runs in the current working directory
- File operations are logged in `.code/sessions/`
- Large operations may take time (be patient!)
- The agent won't overwrite files without verification
- Always review generated code before committing

---

**Pro Tip:** Use `DEBUG_EXECUTION=1 sircode agent` to see detailed step-by-step execution logs.
