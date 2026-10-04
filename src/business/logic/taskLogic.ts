import type { Task } from '../../types/index';

/**
 * Normalizes a date to midnight for comparison, using local timezone.
 */
function toMidnightDate(dateString: string | number | Date): Date {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns true if the given date is exactly "today" based on the user's local timezone.
 */
export function isDateToday(dateString: string | number | Date, now: Date = new Date()): boolean {
  const date = toMidnightDate(dateString);
  const today = toMidnightDate(now);
  return date.getTime() === today.getTime();
}

/**
 * Returns true if the task's due date is today in the local timezone.
 * Important: Only checks the due date, irrespective of completion status.
 */
export function isTaskDueToday(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate) return false;
  return isDateToday(task.dueDate, now);
}

/**
 * Returns true if the task was completed today.
 * Important: Checks completedAt, not dueDate!
 */
export function isCompletedToday(task: Task, now: Date = new Date()): boolean {
  if (task.status !== 'completed' || !task.completedAt) return false;
  return isDateToday(task.completedAt, now);
}

/**
 * Returns true if the task's due date is in the past (before today) and it is NOT completed/cancelled.
 */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'completed') return false;
  
  const dueDate = new Date(task.dueDate);
  return dueDate.getTime() < now.getTime();
}

/**
 * Returns true if the task's due date is in the future (after today) and it is NOT completed/cancelled.
 */
export function isTaskUpcoming(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'completed') return false;
  
  const dueDate = toMidnightDate(task.dueDate);
  const today = toMidnightDate(now);
  return dueDate.getTime() > today.getTime();
}

export function calculateTodayProgress(tasks: Task[], now: Date = new Date()) {
  const dueTodayTasks = tasks.filter(t => isTaskDueToday(t, now));
  const todayTotal = dueTodayTasks.length;
  const completedDueToday = dueTodayTasks.filter(t => t.status === 'completed').length;
  const remainingToday = todayTotal - completedDueToday;
  const completionPercentage = todayTotal > 0 ? Math.round((completedDueToday / todayTotal) * 100) : 100;
  
  // Total completed today, which might include overdue tasks finished today
  const totalCompletedToday = tasks.filter(t => isCompletedToday(t, now)).length;
  
  return {
    todayTotal,
    completedDueToday,
    remainingToday,
    completionPercentage,
    totalCompletedToday
  };
}
