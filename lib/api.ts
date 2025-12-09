import { Task, Project, TaskGroup, Todo, Issue } from './types';
import {
  fetchTasks as fetchTasksFromFirestore,
  fetchTasksByProject as fetchTasksByProjectFromFirestore,
  createTask as createTaskInFirestore,
  updateTask as updateTaskInFirestore,
  updateTaskProgress as updateTaskProgressInFirestore,
  deleteTask as deleteTaskFromFirestore,
  fetchProjects as fetchProjectsFromFirestore,
  createProject as createProjectInFirestore,
  updateProject as updateProjectInFirestore,
  deleteProject as deleteProjectFromFirestore,
  fetchTaskGroups as fetchTaskGroupsFromFirestore,
  createTaskGroup as createTaskGroupInFirestore,
  createTodoInFirestore,
  updateTodoInFirestore,
  deleteTodoFromFirestore,
  fetchTodosByUser,
  fetchTodosByTask,
  updateProjectStats as updateProjectStatsFromFirestore,
  fetchIssuesByProject as fetchIssuesByProjectFromFirestore,
  createIssue as createIssueInFirestore,
  updateIssue as updateIssueInFirestore,
  deleteIssue as deleteIssueFromFirestore,
} from './firestore';
import { auth } from './firebase';

/**
 * 현재 사용자 ID 가져오기
 */
function getCurrentUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  return user.uid;
}

/**
 * 사용자의 모든 작업 가져오기
 */
export async function fetchTasks(): Promise<Task[]> {
  const userId = getCurrentUserId();
  return await fetchTasksFromFirestore(userId);
}

/**
 * 사용자의 특정 프로젝트 작업 가져오기
 */
export async function fetchTasksByProject(projectId: string): Promise<Task[]> {
  const userId = getCurrentUserId();
  return await fetchTasksByProjectFromFirestore(userId, projectId);
}

/**
 * 새 작업 생성
 */
export async function createTask(task: Omit<Task, 'id'>): Promise<string | null> {
  const userId = getCurrentUserId();
  return await createTaskInFirestore(userId, task);
}

/**
 * 작업 업데이트
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
  return await updateTaskInFirestore(taskId, updates);
}

/**
 * 작업 진행률만 업데이트 (최적화)
 */
export async function updateTaskProgress(taskId: string, progress: number): Promise<boolean> {
  return await updateTaskProgressInFirestore(taskId, progress);
}

/**
 * 작업 삭제
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  return await deleteTaskFromFirestore(taskId);
}

/**
 * 사용자의 모든 프로젝트 가져오기
 */
export async function fetchProjects(): Promise<Project[]> {
  const userId = getCurrentUserId();
  return await fetchProjectsFromFirestore(userId);
}

/**
 * 새 프로젝트 생성
 */
export async function createProject(project: Omit<Project, 'id'>): Promise<Project | null> {
  const userId = getCurrentUserId();
  return await createProjectInFirestore(userId, project);
}

/**
 * 프로젝트 업데이트
 */
export async function updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
  return await updateProjectInFirestore(projectId, updates);
}

/**
 * 프로젝트 삭제
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  const userId = getCurrentUserId();
  return await deleteProjectFromFirestore(userId, projectId);
}

/**
 * 사용자의 모든 작업 그룹 가져오기
 */
export async function fetchTaskGroups(): Promise<TaskGroup[]> {
  const userId = getCurrentUserId();
  return await fetchTaskGroupsFromFirestore(userId);
}

/**
 * 새 작업 그룹 생성
 */
export async function createTaskGroup(group: Omit<TaskGroup, 'id' | 'tasks'>): Promise<string | null> {
  const userId = getCurrentUserId();
  return await createTaskGroupInFirestore(userId, group);
}

/**
 * 새 할일 생성
 */
export async function createTodo(todo: Omit<Todo, 'id'>): Promise<string | null> {
  const userId = getCurrentUserId();
  return await createTodoInFirestore(userId, todo);
}

/**
 * 할일 업데이트
 */
export async function updateTodo(todoId: string, updates: Partial<Todo>): Promise<boolean> {
  return await updateTodoInFirestore(todoId, updates);
}

/**
 * 할일 삭제
 */
export async function deleteTodo(todoId: string): Promise<boolean> {
  return await deleteTodoFromFirestore(todoId);
}

/**
 * 사용자의 오늘 할일 가져오기
 */
export async function fetchTodayTodos(): Promise<Todo[]> {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split('T')[0];
  return await fetchTodosByUser(userId, today);
}

/**
 * 사용자의 모든 할일 가져오기 (보류 포함)
 */
export async function fetchAllTodos(): Promise<Todo[]> {
  const userId = getCurrentUserId();
  return await fetchTodosByUser(userId);
}

/**
 * 모든 프로젝트의 통계 업데이트
 */
export async function updateAllProjectStats(): Promise<void> {
  const userId = getCurrentUserId();
  const projects = await fetchProjects();

  console.log(`📊 ${projects.length}개 프로젝트의 통계 업데이트 시작...`);

  for (const project of projects) {
    await updateProjectStatsFromFirestore(project.id, userId);
  }

  console.log('✅ 모든 프로젝트 통계 업데이트 완료');
}

/**
 * 프로젝트의 이슈 가져오기
 */
export async function fetchIssuesByProject(projectId: string): Promise<Issue[]> {
  const userId = getCurrentUserId();
  return await fetchIssuesByProjectFromFirestore(userId, projectId);
}

/**
 * 새 이슈 생성
 */
export async function createIssue(issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
  const userId = getCurrentUserId();
  return await createIssueInFirestore(userId, issue);
}

/**
 * 이슈 업데이트
 */
export async function updateIssue(issueId: string, updates: Partial<Issue>): Promise<boolean> {
  return await updateIssueInFirestore(issueId, updates);
}

/**
 * 이슈 삭제
 */
export async function deleteIssue(issueId: string): Promise<boolean> {
  return await deleteIssueFromFirestore(issueId);
}
