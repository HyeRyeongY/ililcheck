export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  daysRemaining: number;
}

export interface TaskGroup {
  id: string;
  projectId: string;
  name: string;
  progress: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  taskGroupId: string;
  projectId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  dueDate?: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  reportDate: string;
  completionRate: number;
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  notes?: string;
}

export type TabType = 'today' | 'calendar' | 'reports';

export type TaskFilterType = 'all' | 'in_progress' | 'completed' | 'on_hold';

export interface TaskStats {
  total: number;
  inProgress: number;
  completed: number;
  onHold: number;
}
