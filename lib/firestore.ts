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
import { Task, TaskGroup, Project, Todo } from './types';

// 컬렉션 이름
const TASKS_COLLECTION = 'tasks';
const TODOS_COLLECTION = 'todos';
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
      where('userId', '==', userId)
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
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        todos: [], // 여기서는 할일을 포함하지 않음
      };
    });

    // 클라이언트 측에서 정렬 (createdAt 기준 내림차순)
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('작업 조회 실패:', error);
    return [];
  }
}

/**
 * 사용자의 특정 프로젝트 작업 가져오기 (할일 포함)
 */
export async function fetchTasksByProject(userId: string, projectId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      where('projectId', '==', projectId)
    );
    const snapshot = await getDocs(q);

    const tasks: Task[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // 해당 작업의 할일들 가져오기
        const todos = await fetchTodosByTask(doc.id, userId);

        return {
          id: doc.id,
          projectId: data.projectId,
          title: data.title,
          status: data.status,
          progress: data.progress,
          dueDate: data.dueDate,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          todos: todos,
        };
      })
    );

    // 클라이언트 측에서 정렬 (createdAt 기준 내림차순)
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      console.log('Firestore에서 읽어온 프로젝트 데이터:', { id: doc.id, ...data });
      return {
        id: doc.id,
        name: data.name,
        color: data.color,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: data.progress,
        daysRemaining: data.daysRemaining,
        category: data.category || 'personal', // category 필드 추가!
      };
    });

    return projects;
  } catch (error) {
    console.error('프로젝트 조회 실패:', error);
    return [];
  }
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const docSnap = await getDoc(projectRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        color: data.color,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: data.progress,
        daysRemaining: data.daysRemaining,
        category: data.category || 'personal',
      };
    } else {
      console.log("해당 프로젝트가 없습니다.");
      return null;
    }
  } catch (error) {
    console.error("프로젝트 조회 실패:", error);
    return null;
  }
}


/**
 * 새 프로젝트 생성
 */
export async function createProject(
  userId: string,
  project: Omit<Project, 'id'>
): Promise<Project | null> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const docRef = await addDoc(projectsRef, {
      ...project,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 생성된 프로젝트 정보 다시 조회하여 반환
    const newProject = await fetchProject(docRef.id);
    return newProject;
    
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
    console.log('Firestore 업데이트 시작:', { projectId, updates });
    
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    console.log('업데이트할 데이터:', updateData);
    
    await updateDoc(projectRef, updateData);

    console.log('Firestore 업데이트 성공');
    return true;
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    return false;
  }
}

/**
 * 특정 작업의 할일들 가져오기
 */
export async function fetchTodosByTask(taskId: string, userId: string): Promise<Todo[]> {
  try {
    const todosRef = collection(db, TODOS_COLLECTION);
    const q = query(
      todosRef,
      where('taskId', '==', taskId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    const todos: Todo[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        taskId: data.taskId,
        title: data.title,
        status: data.status,
        progress: data.progress,
        dueDate: data.dueDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // 클라이언트 측에서 정렬 (createdAt 기준 내림차순)
    return todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('할일 조회 실패:', error);
    return [];
  }
}

/**
 * 새 할일 생성
 */
export async function createTodoInFirestore(userId: string, todo: Omit<Todo, 'id'>): Promise<string | null> {
  try {
    const todosRef = collection(db, TODOS_COLLECTION);
    
    // undefined 값 제거
    const cleanTodo = { ...todo };
    if (cleanTodo.dueDate === undefined) {
      delete cleanTodo.dueDate;
    }
    
    const docRef = await addDoc(todosRef, {
      ...cleanTodo,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('할일 생성 실패:', error);
    return null;
  }
}

/**
 * 할일 업데이트
 */
export async function updateTodoInFirestore(todoId: string, updates: Partial<Todo>): Promise<boolean> {
  try {
    const todoRef = doc(db, TODOS_COLLECTION, todoId);
    
    // undefined 값 제거
    const cleanUpdates = { ...updates };
    if (cleanUpdates.dueDate === undefined) {
      delete cleanUpdates.dueDate;
    }
    
    await updateDoc(todoRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('할일 업데이트 실패:', error);
    return false;
  }
}

/**
 * 할일 삭제
 */
export async function deleteTodoFromFirestore(todoId: string): Promise<boolean> {
  try {
    const todoRef = doc(db, TODOS_COLLECTION, todoId);
    await deleteDoc(todoRef);

    return true;
  } catch (error) {
    console.error('할일 삭제 실패:', error);
    return false;
  }
}

/**
 * 사용자의 모든 할일 가져오기 (날짜별 필터링 가능)
 */
export async function fetchTodosByUser(userId: string, date?: string): Promise<Todo[]> {
  try {
    const todosRef = collection(db, TODOS_COLLECTION);
    let q;

    // 특정 날짜 필터링
    if (date) {
      q = query(
        todosRef,
        where('userId', '==', userId),
        where('dueDate', '==', date)
      );
    } else {
      q = query(
        todosRef,
        where('userId', '==', userId)
      );
    }

    const snapshot = await getDocs(q);

    const todos: Todo[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        taskId: data.taskId,
        title: data.title,
        status: data.status,
        progress: data.progress,
        dueDate: data.dueDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // 클라이언트 측에서 정렬 (createdAt 기준 내림차순)
    return todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('사용자 할일 조회 실패:', error);
    return [];
  }
}
