/**
 * TaskTool - Manage task lists during sessions
 * Format: [task: action, item?]
 * Actions: create, list, update, complete
 */

export interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'done'
  description?: string
}

const tasks: Map<string, Task> = new Map()
let taskCounter = 0

export interface TaskResult {
  action: 'task'
  command: string
  data?: Task | Task[] | string
  success: boolean
  message: string
}

export function taskCreate(title: string, description = ''): TaskResult {
  taskCounter++
  const id = `task-${taskCounter}`
  const task: Task = {
    id,
    title,
    status: 'pending',
    description,
  }
  tasks.set(id, task)
  return {
    action: 'task',
    command: 'create',
    data: task,
    success: true,
    message: `Created task: ${title}`,
  }
}

export function taskList(): TaskResult {
  const taskList = Array.from(tasks.values())
  return {
    action: 'task',
    command: 'list',
    data: taskList,
    success: true,
    message: `${taskList.length} tasks in list`,
  }
}

export function taskUpdate(id: string, status: 'pending' | 'in_progress' | 'done'): TaskResult {
  const task = tasks.get(id)
  if (!task) {
    return {
      action: 'task',
      command: 'update',
      success: false,
      message: `Task not found: ${id}`,
    }
  }
  task.status = status
  return {
    action: 'task',
    command: 'update',
    data: task,
    success: true,
    message: `Updated ${task.title} to ${status}`,
  }
}

export function taskComplete(id: string): TaskResult {
  return taskUpdate(id, 'done')
}

export function taskReset(): TaskResult {
  tasks.clear()
  taskCounter = 0
  return {
    action: 'task',
    command: 'reset',
    success: true,
    message: 'Task list cleared',
  }
}
