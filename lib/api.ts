import { Task, Project, TaskGroup, Todo } from './types';
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
  fetchTaskGroups as fetchTaskGroupsFromFirestore,
  createTaskGroup as createTaskGroupInFirestore,
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
  // TODO: Firestore에서 할일 생성 함수 구현 필요
  console.log('Creating todo:', todo);
  return null;
}

/**
 * 할일 업데이트
 */
export async function updateTodo(todoId: string, updates: Partial<Todo>): Promise<boolean> {
  // TODO: Firestore에서 할일 업데이트 함수 구현 필요
  console.log('Updating todo:', todoId, updates);
  return false;
}

/**
 * 할일 삭제
 */
export async function deleteTodo(todoId: string): Promise<boolean> {
  // TODO: Firestore에서 할일 삭제 함수 구현 필요
  console.log('Deleting todo:', todoId);
  return false;
}
