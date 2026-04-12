import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Simple task management system
 * Stores tasks in .sircode-tasks.json
 */

export interface Task {
  id: string
  subject: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  created: number
  updated: number
}

export interface TaskListResult {
  action: 'task_list' | 'task_create' | 'task_update'
  tasks: Task[]
  message?: string
}

const TASKS_FILE = '.sircode-tasks.json'

function loadTasks(): Task[] {
  const fullPath = resolve(TASKS_FILE)
  if (!existsSync(fullPath)) {
    return []
  }
  try {
    const content = readFileSync(fullPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

function saveTasks(tasks: Task[]): void {
  const fullPath = resolve(TASKS_FILE)
  writeFileSync(fullPath, JSON.stringify(tasks, null, 2), 'utf-8')
}

export function taskCreate(
  subject: string,
  description = '',
): TaskListResult {
  const tasks = loadTasks()
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const now = Date.now()

  const newTask: Task = {
    id,
    subject,
    description,
    status: 'pending',
    created: now,
    updated: now,
  }

  tasks.push(newTask)
  saveTasks(tasks)

  return {
    action: 'task_create',
    tasks: [newTask],
    message: `Created task: ${subject}`,
  }
}

export function taskList(): TaskListResult {
  const tasks = loadTasks()
  return {
    action: 'task_list',
    tasks,
    message: `${tasks.length} tasks`,
  }
}

export function taskUpdate(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed',
): TaskListResult {
  const tasks = loadTasks()
  const task = tasks.find((t) => t.id === taskId)

  if (!task) {
    return {
      action: 'task_update',
      tasks,
      message: `Task not found: ${taskId}`,
    }
  }

  task.status = status
  task.updated = Date.now()
  saveTasks(tasks)

  return {
    action: 'task_update',
    tasks: [task],
    message: `Updated task to ${status}`,
  }
}
