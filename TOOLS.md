# Sircode Tools Reference Guide

Complete guide to all Sircode tools for autonomous code execution.

## Quick Summary

| Short | Long | What It Does | Format |
|-------|------|-------------|--------|
| `rf` | `read` | Read file | `[read: path]` |
| `fr` | `read_lines` | Read lines | `[read_lines: path, start, end]` |
| `wf` | `write` | Create file | `[write: path, content]` |
| `fe` | `replace` | Replace text | `[replace: path, old, new]` |
| `add` | `append` | Append line | `[append: path, line]` |
| `ls` | `list` | List dir | `[list: path]` |
| `mkdir` | `mkd` | Make dir | `[mkd: path]` |
| `rmf` | `rm` | Delete file | `[rm: path]` |
| `bash` | `sh`/`exec` | Shell cmd | `[bash: command]` |
| `git` | `git` | Git cmd | `[git: command]` |
| `url` | `fetch` | Get URL [BLOCKS] | `[fetch: url, prompt?]` |
| `ws` | `search` | Web search | `[search: query, count?]` |
| `ask` | `question` | Ask user [BLOCKS] | `[question: text]` |
| `tc` | `task_new` | Create task | `[task_new: title, desc]` |
| `tl` | `tasks` | List tasks | `[tasks:]` |
| `tu` | `task_set` | Update task | `[task_set: id, status]` |
| `tc2` | `task_done` | Complete task | `[task_done: id]` |
| `tr` | `tasks_clear` | Clear tasks | `[tasks_clear:]` |
| `kn` | `know`/`kb` | Knowledge base | `[know: query]` |

---

## FILE READING & BROWSING

### `read` (short: `rf`)
Read entire file or specific lines.

**Format:** 
- `[read: path]` - Read entire file
- `[read_lines: path, start, end]` - Read lines start-end

**Examples:**
```
[read: src/app.js]
[read_lines: src/app.js, 1, 50]
[read_lines: package.json, 15, 25]
```

**Returns:** File content as text

---

## FILE WRITING & EDITING

### `write` (short: `wf`)
Create or completely overwrite a file.

**Format:** `[write: path, content]`

**Examples:**
```
[write: hello.py, print("Hello World")]
[write: index.html, <!DOCTYPE html>
<html>
  <body>Hello</body>
</html>]
```

**Returns:** Success confirmation

**⚠️ WARNING:** Overwrites entire file! Use `replace` for edits.

---

### `replace` (short: `fe`)
Replace text in file (precise, safe text replacement).

**Format:** `[replace: path, old_text, new_text, replace_all?]`

**Examples:**
```
[replace: config.js, "debug": false, "debug": true]
[replace: src/app.js, console.log, console.error]
[replace: app.py, import os, import os
import sys, true]
```

**Returns:** JSON with {replaced: boolean, linesChanged: number}

**✅ BEST FOR:**
- Bug fixes (change specific lines)
- Config updates (change settings)
- Targeted edits (find+replace)

---

### `append` (short: `add`)
Add a single line to end of file.

**Format:** `[append: path, line_content]`

**Examples:**
```
[append: .gitignore, node_modules/]
[append: src/imports.js, import axios from 'axios';]
```

**Returns:** Success confirmation

**✅ BEST FOR:**
- Adding imports
- Adding dependencies
- Adding entries to lists

---

## FILE & DIRECTORY OPERATIONS

### `list` (short: `ls`)
List directory contents.

**Format:** `[list: path]` or `[list: .]`

**Examples:**
```
[list: .]
[list: src/]
[list: src/components]
```

**Returns:** Files and folders with sizes

---

### `mkd` (short: `mkdir`)
Create directory.

**Format:** `[mkd: path]`

**Examples:**
```
[mkd: src/utils]
[mkd: tests]
[mkd: build/output]
```

**Returns:** Success confirmation

---

### `rm` (short: `rmf`)
Delete file permanently.

**Format:** `[rm: path]`

**Examples:**
```
[rm: old_file.js]
[rm: temp.log]
```

**Returns:** Success confirmation

**⚠️ WARNING:** Permanent deletion! No undo.

---

## COMMAND EXECUTION & SHELL

### `bash` (short: `sh`, `exec`)
Execute shell commands.

**Format:** `[bash: command]`

**Examples:**
```
[bash: npm install]
[bash: npm test]
[bash: node app.js]
[bash: find src -name "*.ts"]
[bash: ls -la src/ | grep component]
[bash: git status]
```

**Returns:** Command output + exit code

**✅ BEST FOR:**
- Building/running code
- Testing
- Verification
- Shell pipelines

---

## GIT VERSION CONTROL

### `git`
Execute git commands.

**Format:** `[git: command]`

**Examples:**
```
[git: status]
[git: add .]
[git: commit -m "Initial commit"]
[git: push origin main]
[git: log --oneline -n 5]
[git: diff HEAD~1]
```

**Returns:** Git output

---

## WEB TOOLS (⚠️ BLOCKING!)

### `fetch` (short: `url`)
Fetch URL content [**BLOCKS - WAITS FOR RESULT!**]

**Format:** `[fetch: url, optional_prompt]`

**Examples:**
```
[fetch: https://api.github.com/users/torvalds]
[fetch: https://docs.nodejs.org, Extract the fs module API]
[fetch: https://jsonplaceholder.typicode.com/users/1]
```

**Returns:** JSON with {data: "...", status: 200, error: null}

**⚠️ CRITICAL BLOCKING BEHAVIOR:**
1. You call the tool
2. System waits for HTTP response
3. You receive the actual data
4. You continue with that data

**DO NOT:**
- ❌ Assume what the URL returns
- ❌ Chain multiple fetches without waiting
- ❌ Fetch interactive sites

**DO:**
- ✅ Wait for the complete result
- ✅ Check `status === 200` before using data
- ✅ Use the actual returned data, not predictions

---

### `search` (short: `ws`)
Search the internet.

**Format:** `[search: query, num_results?]`

**Examples:**
```
[search: how to deploy node.js to heroku]
[search: React hooks best practices, 5]
[search: debugging TypeScript errors]
```

**Returns:** Array of search results with links

**NOTE:** Results include URLs. Use `fetch` to get the actual content.

---

## USER INTERACTION

### `question` (short: `ask`)
Ask user for input [**BLOCKS - WAITS FOR ANSWER!**]

**Format:** `[question: your question]`

**Examples:**
```
[question: Should we use TypeScript?]
[question: Which database: MongoDB or PostgreSQL?]
[question: What's your API key?]
```

**Returns:** User's answer as string

**⚠️ CRITICAL BLOCKING BEHAVIOR:**
1. You call the tool
2. System shows user the question
3. You WAIT for user to respond
4. You receive their actual answer
5. You continue with that answer

**DO NOT:**
- ❌ Assume user will say yes/no
- ❌ Make decisions user should make
- ❌ Ask vague questions

**DO:**
- ✅ Wait for actual user response
- ✅ Ask clear, specific questions
- ✅ Use the actual user answer, not your guess

---

## TASK MANAGEMENT

### `task_new` (short: `tc`)
Create new task.

**Format:** `[task_new: title, description]`

**Examples:**
```
[task_new: Fix login bug, User can't reset password]
[task_new: Add TypeScript, Convert JS project to TS]
```

**Returns:** Task ID

---

### `tasks` (short: `tl`)
List all tasks.

**Format:** `[tasks:]` (no arguments)

**Returns:** Array of tasks with IDs and status

---

### `task_set` (short: `tu`)
Update task status.

**Format:** `[task_set: task_id, status]`

Status values: `pending`, `in_progress`, `done`

**Examples:**
```
[task_set: task_1, in_progress]
[task_set: task_2, done]
```

**Returns:** Updated task

---

### `task_done` (short: `tc2`)
Mark task complete.

**Format:** `[task_done: task_id]`

**Examples:**
```
[task_done: task_1]
[task_done: task_3]
```

**Returns:** Completed task

---

### `tasks_clear` (short: `tr`)
Clear all tasks.

**Format:** `[tasks_clear:]` (no arguments)

**Returns:** Confirmation

---

## KNOWLEDGE BASE

### `know` (short: `kn`, `kb`)
Query knowledge base.

**Format:** `[know: query]`

**Examples:**
```
[know: how to handle 404 errors]
[know: CORS headers]
```

**Returns:** Relevant knowledge articles

---

## 🧠 WORKFLOW EXAMPLES

### Example 1: Fix a Bug

```
1. [read: src/bug.js]           ← Understand
2. [bash: npm test]              ← Verify fails
3. [replace: src/bug.js, old, new] ← Fix
4. [bash: npm test]              ← Verify passes
```

### Example 2: Create Project with Web Reference

```
1. [search: react typescript setup]    ← Research
2. [fetch: https://react.dev]          ← Get docs [WAITS]
3. [write: App.tsx, ...code...]        ← Create
4. [bash: npm run build]               ← Test
```

### Example 3: Ask User and Act

```
1. [question: Use Docker?]             ← Ask [WAITS]
   → User: "Yes"
2. [write: Dockerfile, ...]            ← Create
3. [append: .gitignore, .dockerignore] ← Update
4. [bash: docker build .]              ← Test
```

### Example 4: Task Tracking

```
1. [task_new: Implement auth, Add login/logout]
2. [task_new: Add tests, Write unit tests]
3. [tasks:]                            ← Show all
4. [task_set: task_1, in_progress]    ← Start work
5. [task_done: task_1]                 ← Mark done
```

---

## ⚠️ CRITICAL RULES

### Blocking Operations
These tools BLOCK and wait for results:
- `fetch` - Waits for HTTP response
- `question` - Waits for user input

**ALWAYS wait for these to complete before continuing.**

### Tool Format
Use brackets: `[tool: args]`
NOT markdown code blocks!

✅ `[write: file.js, content]`
❌ ` ```bash\nwrite: file.js, content\n``` `

### File Safety
- Always `read` before using `replace`
- Use `replace` not `write` for edits
- Double-check paths before `rm`

### Tool Aliases
All tools have short names (power users) and long names (clarity):
- `write` = `wf`
- `read` = `rf`
- `fetch` = `url`
- etc.

---

## 🎯 DECISION TREE

**Need to understand code?**
→ `read` or `read_lines`

**Need to modify code?**
→ `replace` (precise, safe)

**Need to create file?**
→ `write`

**Need to add one line?**
→ `append`

**Need to execute/build?**
→ `bash`

**Need external data?**
→ `fetch` (waits for result)

**Need to research?**
→ `search` then `fetch`

**Need user input?**
→ `question` (waits for answer)

**Need to organize work?**
→ `task_new`, `task_set`, `task_done`

---

## Example: Real Workflow

```
User: "Fix the login bug and add password reset"

1. [bash: npm test]                    ← Check current state
2. [search: node password reset]       ← Research pattern
3. [fetch: https://docs...]            ← Get actual docs [WAITS]
4. [read: src/auth.js]                 ← Read current code
5. [task_new: Fix login, Handle errors properly]
6. [task_set: task_1, in_progress]
7. [replace: src/auth.js, old, new]    ← Fix code
8. [bash: npm test]                    ← Verify
9. [task_done: task_1]
10. [question: Ready to deploy?]       ← Ask [WAITS]
    → User: "Yes"
11. [bash: git add . && git commit -m "Fix login"]
12. [bash: npm run deploy]
```

---

Generated: April 27, 2026
Part of Sircode v0.1.0
