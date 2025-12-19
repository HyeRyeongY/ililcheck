export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  startDate: string;
  endDate: string | null;
  progress: number;
  daysRemaining: number | null;
  category: 'personal' | 'work'; // 개인/업무 구분
  completedTasks?: number;
  totalTasks?: number;
  completedTodos?: number;
  totalTodos?: number;
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
  projectId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  dueDate?: string;
  createdAt: string;
  startDate?: string;
  completedDate?: string;
  todos: Todo[];
  order?: number;
}

export interface Todo {
  id: string;
  taskId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'on_hold' | 'postponed';
  progress: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  completedDate?: string;
  order?: number;
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

export interface ProjectReport {
  id: string;
  name: string;
  color: string;
  totalTasks: number;
  completedTasks: number;
  totalTodos: number;
  completedTodos: number;
  taskProgress: number;
  todoProgress: number;
  overallProgress: number;
  progressHistory: ProgressHistoryPoint[];
}

export interface ProgressHistoryPoint {
  date: string;
  progress: number | null;
}

export type TabType = 'today' | 'calendar' | 'reports';

export type ProjectCategory = 'personal' | 'work';

export type TaskFilterType = 'all' | 'in_progress' | 'completed' | 'on_hold';

export interface TaskStats {
  total: number;
  inProgress: number;
  completed: number;
  onHold: number;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export type UserRole = 'master' | 'manager' | 'user';

export interface UserInfo {
  uid: string;
  userId: string;            // 로그인용 아이디 (required)
  username: string;          // 화면 표시용 이름 (required)
  email: string | null;      // 선택
  displayName: string | null;
  createdAt: string;
  lastLoginAt: string;
  provider: string;
  role?: UserRole;
}
