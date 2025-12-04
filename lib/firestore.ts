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
  deleteField,
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
        startDate: data.startDate,
        completedDate: data.completedDate,
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
          startDate: data.startDate,
          completedDate: data.completedDate,
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

    // 현재 작업 데이터 가져오기
    const taskSnap = await getDoc(taskRef);
    const currentData = taskSnap.data();

    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // 상태가 completed로 변경되면서 completedDate가 없으면 자동 설정
    if (updates.status === 'completed' && !updates.completedDate && !currentData?.completedDate) {
      updateData.completedDate = new Date().toISOString();
    }

    // 상태가 completed가 아닌데 completedDate가 설정되어 있으면 삭제
    if (updates.status && updates.status !== 'completed' && currentData?.completedDate && updates.completedDate === undefined) {
      updateData.completedDate = deleteField();
    }

    await updateDoc(taskRef, updateData);

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

    // 현재 작업 데이터 가져오기
    const taskSnap = await getDoc(taskRef);
    const currentData = taskSnap.data();

    if (!currentData) {
      console.error('작업을 찾을 수 없습니다.');
      return false;
    }

    const projectId = currentData.projectId;
    const userId = currentData.userId;
    const progressChanged = progress !== currentData.progress;

    const updates: any = {
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: serverTimestamp(),
    };

    // 0에서 진행률이 생기면 시작일 기록 (처음 시작할 때만)
    if (currentData && currentData.progress === 0 && progress > 0 && !currentData.startDate) {
      updates.startDate = new Date().toISOString();
    }

    // 진행률이 0으로 돌아가면 시작일 삭제
    if (progress === 0 && currentData?.startDate) {
      updates.startDate = deleteField();
    }

    // 진행률이 100%면 자동으로 완료 상태로 변경하고 완료일 기록
    if (progress >= 100) {
      updates.status = 'completed';
      if (!currentData?.completedDate) {
        updates.completedDate = new Date().toISOString();
      }
    }

    // 진행률이 100 미만으로 변경되면 완료일 삭제
    if (progress < 100 && currentData?.completedDate) {
      updates.completedDate = deleteField();
    }

    await updateDoc(taskRef, updates);

    // 진행률이 변경되었으면 상위 Project의 진행률도 업데이트
    if (progressChanged && projectId && userId) {
      await updateProjectProgressFromTasks(projectId, userId);
    }

    return true;
  } catch (error) {
    console.error('작업 진행률 업데이트 실패:', error);
    return false;
  }
}

/**
 * Project의 Tasks 진행률을 기반으로 Project 진행률 자동 업데이트
 */
async function updateProjectProgressFromTasks(projectId: string, userId: string): Promise<void> {
  try {
    // 해당 Project의 모든 Tasks 가져오기
    const tasks = await fetchTasksByProject(userId, projectId);

    if (tasks.length === 0) {
      // Task가 없으면 Project 진행률을 0으로 설정
      await updateProject(projectId, { progress: 0 });
      return;
    }

    // 평균 진행률 계산
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    const averageProgress = Math.round(totalProgress / tasks.length);

    // Project 진행률 업데이트
    await updateProject(projectId, { progress: averageProgress });
  } catch (error) {
    console.error('Project 진행률 자동 업데이트 실패:', error);
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
 * 사용자의 모든 작업 그룹 가져오기 (작업 및 할일 포함)
 */
export async function fetchTaskGroups(userId: string): Promise<TaskGroup[]> {
  try {
    const groupsRef = collection(db, TASK_GROUPS_COLLECTION);
    const q = query(groupsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    console.log('fetchTaskGroups - TaskGroups 수:', snapshot.docs.length);

    // 먼저 모든 작업을 한 번에 가져오기 (성능 최적화)
    const tasksRef = collection(db, TASKS_COLLECTION);
    const tasksQuery = query(tasksRef, where('userId', '==', userId));
    const tasksSnapshot = await getDocs(tasksQuery);

    console.log('fetchTaskGroups - Tasks 수:', tasksSnapshot.docs.length);

    // 작업을 projectId로 그룹화
    const tasksByProject: { [projectId: string]: Task[] } = {};

    await Promise.all(
      tasksSnapshot.docs.map(async (taskDoc) => {
        const data = taskDoc.data();
        const projectId = data.projectId;

        // 해당 작업의 할일들 가져오기
        const todos = await fetchTodosByTask(taskDoc.id, userId);

        const task: Task = {
          id: taskDoc.id,
          projectId: data.projectId,
          title: data.title,
          status: data.status,
          progress: data.progress,
          dueDate: data.dueDate,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          startDate: data.startDate,
          completedDate: data.completedDate,
          todos: todos,
        };

        if (!tasksByProject[projectId]) {
          tasksByProject[projectId] = [];
        }
        tasksByProject[projectId].push(task);
      })
    );

    // 각 TaskGroup에 해당하는 작업들 할당
    const groups: TaskGroup[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const projectId = data.projectId;
      const tasksForProject = tasksByProject[projectId] || [];

      console.log(`TaskGroup "${data.name}" (projectId: ${projectId}) - Tasks 수:`, tasksForProject.length);

      return {
        id: doc.id,
        name: data.name,
        projectId: projectId,
        progress: data.progress,
        tasks: tasksForProject,
      };
    });

    console.log('fetchTaskGroups - 반환할 groups:', groups.length);
    console.log('fetchTaskGroups - tasksByProject keys:', Object.keys(tasksByProject));

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
        startDate: data.startDate,
        completedDate: data.completedDate,
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

    // 현재 할일 데이터 가져오기
    const todoSnap = await getDoc(todoRef);
    const currentData = todoSnap.data();

    if (!currentData) {
      console.error('할일을 찾을 수 없습니다.');
      return false;
    }

    const taskId = currentData.taskId;
    const progressChanged = updates.progress !== undefined && updates.progress !== currentData.progress;

    // undefined 값을 deleteField()로 변환 또는 제거
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        // undefined인 경우 deleteField()로 변환 (Firestore에서 필드 삭제)
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
    }

    // 진행률 변경 감지 및 자동 날짜 기록
    if (cleanUpdates.progress !== undefined && currentData) {
      // 0에서 진행률이 생기면 시작일 기록 (처음 시작할 때만)
      if (currentData.progress === 0 && cleanUpdates.progress > 0 && !currentData.startDate) {
        cleanUpdates.startDate = new Date().toISOString();
      }

      // 진행률이 0으로 돌아가면 시작일 삭제
      if (cleanUpdates.progress === 0 && currentData.startDate) {
        cleanUpdates.startDate = deleteField() as any;
      }

      // 진행률이 100%면 완료일 기록
      if (cleanUpdates.progress >= 100 && !currentData.completedDate) {
        cleanUpdates.completedDate = new Date().toISOString();
      }

      // 진행률이 100 미만으로 변경되면 완료일 삭제
      if (cleanUpdates.progress < 100 && currentData.completedDate) {
        cleanUpdates.completedDate = deleteField() as any;
      }
    }

    // 상태 변경 시에도 완료일 처리
    if (cleanUpdates.status !== undefined && currentData) {
      // 상태가 completed로 변경되면서 completedDate가 없으면 자동 설정
      if (cleanUpdates.status === 'completed' && !cleanUpdates.completedDate && !currentData.completedDate) {
        cleanUpdates.completedDate = new Date().toISOString();
      }

      // 상태가 completed가 아닌데 completedDate가 설정되어 있으면 삭제
      if (cleanUpdates.status !== 'completed' && currentData.completedDate && cleanUpdates.completedDate === undefined) {
        cleanUpdates.completedDate = deleteField() as any;
      }
    }

    await updateDoc(todoRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });

    // 진행률이 변경되었으면 상위 Task의 진행률도 업데이트
    if (progressChanged && taskId) {
      await updateTaskProgressFromTodos(taskId, currentData.userId);
    }

    return true;
  } catch (error) {
    console.error('할일 업데이트 실패:', error);
    return false;
  }
}

/**
 * Task의 Todos 진행률을 기반으로 Task 진행률 자동 업데이트
 */
async function updateTaskProgressFromTodos(taskId: string, userId: string): Promise<void> {
  try {
    // 해당 Task의 모든 Todos 가져오기
    const todos = await fetchTodosByTask(taskId, userId);

    if (todos.length === 0) {
      // Todo가 없으면 Task 진행률을 0으로 설정
      await updateTaskProgress(taskId, 0);
      return;
    }

    // 평균 진행률 계산
    const totalProgress = todos.reduce((sum, todo) => sum + todo.progress, 0);
    const averageProgress = Math.round(totalProgress / todos.length);

    // Task 진행률 업데이트
    await updateTaskProgress(taskId, averageProgress);
  } catch (error) {
    console.error('Task 진행률 자동 업데이트 실패:', error);
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
        startDate: data.startDate,
        completedDate: data.completedDate,
      };
    });

    // 클라이언트 측에서 정렬 (createdAt 기준 내림차순)
    return todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('사용자 할일 조회 실패:', error);
    return [];
  }
}
