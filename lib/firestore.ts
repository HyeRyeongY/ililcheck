import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, TaskGroup, Project } from './types';

// 컬렉션 이름
const TASKS_COLLECTION = 'tasks';
const TASK_GROUPS_COLLECTION = 'taskGroups';
const PROJECTS_COLLECTION = 'projects';

/**
 * 사용자의 모든 작업 가져오기
 */
export async function fetchTasks(userId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const tasks: Task[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        status: data.status,
        progress: data.progress,
        dueDate: data.dueDate,
        projectId: data.projectId,
      };
    });

    return tasks;
  } catch (error) {
    console.error('작업 조회 실패:', error);
    return [];
  }
}

/**
 * 사용자의 특정 프로젝트 작업 가져오기
 */
export async function fetchTasksByProject(userId: string, projectId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const tasks: Task[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        status: data.status,
        progress: data.progress,
        dueDate: data.dueDate,
        projectId: data.projectId,
      };
    });

    return tasks;
  } catch (error) {
    console.error('프로젝트 작업 조회 실패:', error);
    return [];
  }
}

/**
 * 새 작업 생성
 */
export async function createTask(userId: string, task: Omit<Task, 'id'>): Promise<string | null> {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const docRef = await addDoc(tasksRef, {
      ...task,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('작업 생성 실패:', error);
    return null;
  }
}

/**
 * 작업 업데이트
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<boolean> {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('작업 업데이트 실패:', error);
    return false;
  }
}

/**
 * 작업 진행률만 업데이트 (최적화)
 */
export async function updateTaskProgress(
  taskId: string,
  progress: number
): Promise<boolean> {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const updates: any = {
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: serverTimestamp(),
    };

    // 진행률이 100%면 자동으로 완료 상태로 변경
    if (progress >= 100) {
      updates.status = 'completed';
    }

    await updateDoc(taskRef, updates);

    return true;
  } catch (error) {
    console.error('작업 진행률 업데이트 실패:', error);
    return false;
  }
}

/**
 * 작업 삭제
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);

    return true;
  } catch (error) {
    console.error('작업 삭제 실패:', error);
    return false;
  }
}

/**
 * 사용자의 모든 작업 그룹 가져오기
 */
export async function fetchTaskGroups(userId: string): Promise<TaskGroup[]> {
  try {
    const groupsRef = collection(db, TASK_GROUPS_COLLECTION);
    const q = query(groupsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const groups: TaskGroup[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        projectId: data.projectId,
        progress: data.progress,
        tasks: [],
      };
    });

    return groups;
  } catch (error) {
    console.error('작업 그룹 조회 실패:', error);
    return [];
  }
}

/**
 * 새 작업 그룹 생성
 */
export async function createTaskGroup(
  userId: string,
  group: Omit<TaskGroup, 'id' | 'tasks'>
): Promise<string | null> {
  try {
    const groupsRef = collection(db, TASK_GROUPS_COLLECTION);
    const docRef = await addDoc(groupsRef, {
      ...group,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('작업 그룹 생성 실패:', error);
    return null;
  }
}

/**
 * 사용자의 모든 프로젝트 가져오기
 */
export async function fetchProjects(userId: string): Promise<Project[]> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const q = query(projectsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const projects: Project[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        color: data.color,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: data.progress,
        daysRemaining: data.daysRemaining,
      };
    });

    return projects;
  } catch (error) {
    console.error('프로젝트 조회 실패:', error);
    return [];
  }
}

/**
 * 새 프로젝트 생성
 */
export async function createProject(
  userId: string,
  project: Omit<Project, 'id'>
): Promise<string | null> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const docRef = await addDoc(projectsRef, {
      ...project,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    return null;
  }
}

/**
 * 프로젝트 업데이트
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<boolean> {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    return false;
  }
}
