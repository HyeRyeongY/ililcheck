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
import { Task, TaskGroup, Project, Todo, Issue } from './types';

// 컬렉션 이름
const TASKS_COLLECTION = 'tasks';
const TODOS_COLLECTION = 'todos';
const TASK_GROUPS_COLLECTION = 'taskGroups';
const PROJECTS_COLLECTION = 'projects';
const ISSUES_COLLECTION = 'issues';

/**
 * 프로젝트 통계 재계산 및 업데이트
 *
 * 프로젝트의 모든 Tasks와 Todos를 조회하여 통계를 계산하고 프로젝트 문서를 업데이트합니다.
 */
export async function updateProjectStats(projectId: string, userId: string): Promise<void> {
  try {
    console.log(`📊 프로젝트 통계 업데이트 시작: ${projectId}`);

    // 1. 프로젝트의 모든 Tasks 조회
    const tasksRef = collection(db, TASKS_COLLECTION);
    const tasksQuery = query(
      tasksRef,
      where('userId', '==', userId),
      where('projectId', '==', projectId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);

    const totalTasks = tasksSnapshot.size;

    // 2. 모든 Tasks의 Todos 조회 및 Task 진행률 재계산
    let totalTodos = 0;
    let completedTodos = 0;
    let completedTasksCount = 0; // 재계산 후 완료된 작업 개수

    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const todosRef = collection(db, TODOS_COLLECTION);
      const todosQuery = query(
        todosRef,
        where('userId', '==', userId),
        where('taskId', '==', taskDoc.id)
      );
      const todosSnapshot = await getDocs(todosQuery);

      totalTodos += todosSnapshot.size;
      completedTodos += todosSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length;

      // 이 작업의 할일들로부터 작업 진행률 재계산
      if (todosSnapshot.size > 0) {
        const todoProgresses = todosSnapshot.docs.map(doc => doc.data().progress || 0);
        const avgProgress = Math.round(
          todoProgresses.reduce((sum, p) => sum + p, 0) / todoProgresses.length
        );

        // 작업의 상태 결정
        const newStatus = avgProgress === 100 ? 'completed'
                        : avgProgress > 0 ? 'in_progress'
                        : 'todo';

        // 작업 문서 업데이트 (progress와 status)
        const taskRef = doc(db, TASKS_COLLECTION, taskDoc.id);
        const updates: any = {
          progress: avgProgress,
          status: newStatus,
          updatedAt: serverTimestamp(),
        };

        // 완료 상태로 변경될 때 완료일 설정
        if (newStatus === 'completed' && !taskData.completedDate) {
          updates.completedDate = new Date().toISOString();
        }
        // 완료 상태가 아닌데 완료일이 있으면 삭제
        if (newStatus !== 'completed' && taskData.completedDate) {
          updates.completedDate = deleteField();
        }

        // 진행 중으로 변경될 때 시작일 설정
        if (newStatus === 'in_progress' && !taskData.startDate) {
          updates.startDate = new Date().toISOString();
        }
        // 시작 전으로 돌아가면 시작일 삭제
        if (newStatus === 'todo' && taskData.startDate) {
          updates.startDate = deleteField();
        }

        await updateDoc(taskRef, updates);

        // 완료된 작업 개수 계산
        if (newStatus === 'completed') {
          completedTasksCount++;
        }

        console.log(`  작업 "${taskData.title}" 진행률 업데이트: ${avgProgress}% (${newStatus})`);
      } else {
        // 할일이 없는 작업은 기존 상태 유지
        if (taskData.status === 'completed') {
          completedTasksCount++;
        }
      }
    }

    console.log(`  작업: ${completedTasksCount}/${totalTasks}`);
    console.log(`  할일: ${completedTodos}/${totalTodos}`);

    // 3. 전체 진행률 계산
    const totalItems = totalTasks + totalTodos;
    const completedItems = completedTasksCount + completedTodos;
    const progress = totalItems > 0
      ? Math.round((completedItems / totalItems) * 100)
      : 0;

    console.log(`  전체 진행률: ${progress}%`);

    // 4. 프로젝트 문서 업데이트
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, {
      totalTasks,
      completedTasks: completedTasksCount,
      totalTodos,
      completedTodos,
      progress,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ 프로젝트 통계 업데이트 완료`);
  } catch (error) {
    console.error('❌ 프로젝트 통계 업데이트 실패:', error);
    throw error;
  }
}

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

    const tasks: Task[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // 해당 작업의 할일들 가져오기
        const todos = await fetchTodosByTask(doc.id, userId);

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
          todos: todos,
        };
      })
    );

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

    // 프로젝트 통계 업데이트
    await updateProjectStats(task.projectId, userId);

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

    // 상태가 in_progress로 변경되면서 startDate가 없으면 자동 설정
    if (updates.status === 'in_progress' && !updates.startDate && !currentData?.startDate) {
      updateData.startDate = new Date().toISOString();
    }

    // id와 todos 필드는 제외
    delete updateData.id;
    delete updateData.todos;

    await updateDoc(taskRef, updateData);

    // 프로젝트 통계 업데이트 (상태 변경 시)
    if (updates.status && currentData) {
      const projectId = currentData.projectId;
      const userId = currentData.userId;
      await updateProjectStats(projectId, userId);
    }

    return true;
  } catch (error) {
    console.error('작업 업데이트 실패:', error);
    return false;
  }
}

/**
 * 작업 진행률만 업데이트 (최적화)
 */
export async function updateTaskProgress(taskId: string, progress: number): Promise<boolean> {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      progress,
      updatedAt: serverTimestamp(),
    });

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
    // 작업 정보 먼저 가져오기 (프로젝트 ID 필요)
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      console.error('작업을 찾을 수 없습니다.');
      return false;
    }

    const taskData = taskSnap.data();
    const projectId = taskData.projectId;
    const userId = taskData.userId;

    await deleteDoc(taskRef);

    // 프로젝트 통계 업데이트
    await updateProjectStats(projectId, userId);

    return true;
  } catch (error) {
    console.error('작업 삭제 실패:', error);
    return false;
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
        progress: data.progress || 0,
        daysRemaining: calculateDaysRemaining(data.endDate),
        category: data.category || 'personal',
        completedTasks: data.completedTasks || 0,
        totalTasks: data.totalTasks || 0,
        completedTodos: data.completedTodos || 0,
        totalTodos: data.totalTodos || 0,
      };
    });

    return projects;
  } catch (error) {
    console.error('프로젝트 조회 실패:', error);
    return [];
  }
}

/**
 * 종료일까지 남은 일수 계산
 */
function calculateDaysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * 작업 그룹 조회
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
 * 새 프로젝트 생성
 */
export async function createProject(userId: string, project: Omit<Project, 'id'>): Promise<Project | null> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const docRef = await addDoc(projectsRef, {
      ...project,
      userId,
      totalTasks: 0,
      completedTasks: 0,
      totalTodos: 0,
      completedTodos: 0,
      progress: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      ...project,
      id: docRef.id,
      totalTasks: 0,
      completedTasks: 0,
      totalTodos: 0,
      completedTodos: 0,
    };
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    return null;
  }
}

/**
 * 프로젝트 업데이트
 */
export async function updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);

    // id 필드 제외
    const updateData = { ...updates };
    delete updateData.id;
    delete updateData.daysRemaining;

    await updateDoc(projectRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    return false;
  }
}

/**
 * 프로젝트 삭제 (관련 데이터 포함)
 *
 * 프로젝트와 관련된 모든 Tasks, Todos, TaskGroups를 삭제합니다.
 * 시간이 걸릴 수 있으므로 UI에서 로딩 표시를 해야 합니다.
 */
export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  try {
    console.log('🗑️ 프로젝트 삭제 시작:', projectId, 'userId:', userId);

    // 1. 프로젝트의 모든 Tasks 조회 (userId 조건 추가)
    console.log('  1️⃣ Tasks 조회 시작...');
    const tasksRef = collection(db, TASKS_COLLECTION);
    const tasksQuery = query(
      tasksRef,
      where('userId', '==', userId),
      where('projectId', '==', projectId)
    );

    let tasksSnapshot;
    try {
      tasksSnapshot = await getDocs(tasksQuery);
      console.log(`  ✅ Tasks 조회 성공: ${tasksSnapshot.size}개`);
    } catch (error) {
      console.error('  ❌ Tasks 조회 실패:', error);
      throw error;
    }

    // 2. 각 Task의 Todos 삭제 후 Task 삭제
    console.log('  2️⃣ Todos 및 Tasks 삭제 시작...');
    for (const taskDoc of tasksSnapshot.docs) {
      console.log(`    - Task "${taskDoc.id}" 처리 중...`);

      // Task의 모든 Todos 조회 (userId 조건 추가)
      const todosRef = collection(db, TODOS_COLLECTION);
      const todosQuery = query(
        todosRef,
        where('userId', '==', userId),
        where('taskId', '==', taskDoc.id)
      );

      let todosSnapshot;
      try {
        todosSnapshot = await getDocs(todosQuery);
        console.log(`      ✓ Todos 조회 성공: ${todosSnapshot.size}개`);
      } catch (error) {
        console.error(`      ✗ Todos 조회 실패:`, error);
        throw error;
      }

      // Todos 삭제
      for (const todoDoc of todosSnapshot.docs) {
        try {
          await deleteDoc(todoDoc.ref);
          console.log(`      ✓ Todo "${todoDoc.id}" 삭제 완료`);
        } catch (error) {
          console.error(`      ✗ Todo "${todoDoc.id}" 삭제 실패:`, error);
          throw error;
        }
      }

      // Task 삭제
      try {
        await deleteDoc(taskDoc.ref);
        console.log(`    ✓ Task "${taskDoc.id}" 삭제 완료`);
      } catch (error) {
        console.error(`    ✗ Task "${taskDoc.id}" 삭제 실패:`, error);
        throw error;
      }
    }

    // 3. TaskGroups 삭제 (userId 조건 추가)
    console.log('  3️⃣ TaskGroups 삭제 시작...');
    const taskGroupsRef = collection(db, TASK_GROUPS_COLLECTION);
    const taskGroupsQuery = query(
      taskGroupsRef,
      where('userId', '==', userId),
      where('projectId', '==', projectId)
    );

    let taskGroupsSnapshot;
    try {
      taskGroupsSnapshot = await getDocs(taskGroupsQuery);
      console.log(`  ✅ TaskGroups 조회 성공: ${taskGroupsSnapshot.size}개`);
    } catch (error) {
      console.error('  ❌ TaskGroups 조회 실패:', error);
      throw error;
    }

    for (const groupDoc of taskGroupsSnapshot.docs) {
      try {
        await deleteDoc(groupDoc.ref);
        console.log(`  ✓ TaskGroup "${groupDoc.id}" 삭제 완료`);
      } catch (error) {
        console.error(`  ✗ TaskGroup "${groupDoc.id}" 삭제 실패:`, error);
        throw error;
      }
    }

    // 4. 마지막으로 프로젝트 삭제
    console.log('  4️⃣ 프로젝트 삭제 시작...');
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    try {
      await deleteDoc(projectRef);
      console.log('  ✅ 프로젝트 삭제 완료');
    } catch (error) {
      console.error('  ❌ 프로젝트 삭제 실패:', error);
      throw error;
    }

    console.log('✅ 프로젝트 및 관련 데이터 삭제 완료');

    return true;
  } catch (error) {
    console.error('❌ 프로젝트 삭제 실패:', error);
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
    }
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
        order: data.order ?? 0,
      };
    });

    // 클라이언트 측에서 정렬 (order 기준 오름차순)
    return todos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
    Object.keys(cleanTodo).forEach(key => {
      if (cleanTodo[key as keyof typeof cleanTodo] === undefined) {
        delete cleanTodo[key as keyof typeof cleanTodo];
      }
    });

    const docRef = await addDoc(todosRef, {
      ...cleanTodo,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Task에서 projectId 가져오기
    const taskRef = doc(db, TASKS_COLLECTION, todo.taskId);
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
      const taskData = taskSnap.data();
      const projectId = taskData.projectId;

      // 프로젝트 통계 업데이트
      await updateProjectStats(projectId, userId);
    }

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

    // 상태가 in_progress로 변경되면서 startDate가 없으면 자동 설정
    if (updates.status === 'in_progress' && !updates.startDate && !currentData?.startDate) {
      updateData.startDate = new Date().toISOString();
    }

    // id 필드 제외
    delete updateData.id;

    await updateDoc(todoRef, updateData);

    // 프로젝트 통계 업데이트 (상태 또는 진행률 변경 시)
    if ((updates.status || updates.progress !== undefined) && currentData) {
      const taskId = currentData.taskId;
      const userId = currentData.userId;

      // Task에서 projectId 가져오기
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      const taskSnap = await getDoc(taskRef);

      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        const projectId = taskData.projectId;
        await updateProjectStats(projectId, userId);
      }
    }

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
    // 할일 정보 먼저 가져오기
    const todoRef = doc(db, TODOS_COLLECTION, todoId);
    const todoSnap = await getDoc(todoRef);

    if (!todoSnap.exists()) {
      console.error('할일을 찾을 수 없습니다.');
      return false;
    }

    const todoData = todoSnap.data();
    const taskId = todoData.taskId;
    const userId = todoData.userId;

    await deleteDoc(todoRef);

    // Task에서 projectId 가져오기
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
      const taskData = taskSnap.data();
      const projectId = taskData.projectId;

      // 프로젝트 통계 업데이트
      await updateProjectStats(projectId, userId);
    }

    return true;
  } catch (error) {
    console.error('할일 삭제 실패:', error);
    return false;
  }
}

/**
 * 사용자의 할일 가져오기 (날짜별 또는 전체)
 */
export async function fetchTodosByUser(userId: string, date?: string): Promise<Todo[]> {
  try {
    const todosRef = collection(db, TODOS_COLLECTION);
    let q;

    if (date) {
      // 특정 날짜의 할일만 가져오기
      q = query(
        todosRef,
        where('userId', '==', userId),
        where('dueDate', '==', date)
      );
    } else {
      // 모든 할일 가져오기
      q = query(todosRef, where('userId', '==', userId));
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
        order: data.order ?? 0,
      };
    });

    // 클라이언트 측에서 정렬 (order 기준 오름차순)
    return todos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('사용자 할일 조회 실패:', error);
    return [];
  }
}

/**
 * 프로젝트의 이슈 가져오기
 */
export async function fetchIssuesByProject(userId: string, projectId: string): Promise<Issue[]> {
  try {
    const issuesRef = collection(db, ISSUES_COLLECTION);
    const q = query(
      issuesRef,
      where('userId', '==', userId),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        resolvedAt: data.resolvedAt,
      };
    });
  } catch (error) {
    console.error('이슈 조회 실패:', error);
    return [];
  }
}

/**
 * 새 이슈 생성
 */
export async function createIssue(userId: string, issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
  try {
    console.log('Firestore createIssue 호출:', { userId, issue });
    const issuesRef = collection(db, ISSUES_COLLECTION);
    const docRef = await addDoc(issuesRef, {
      ...issue,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('Firestore 이슈 생성 성공:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('이슈 생성 실패:', error);
    return null;
  }
}

/**
 * 이슈 업데이트
 */
export async function updateIssue(issueId: string, updates: Partial<Issue>): Promise<boolean> {
  try {
    const issueRef = doc(db, ISSUES_COLLECTION, issueId);

    // id 필드 제외
    const updateData = { ...updates };
    delete updateData.id;

    // resolvedAt 처리
    if (updates.status === 'resolved' && !updates.resolvedAt) {
      updateData.resolvedAt = new Date().toISOString();
    }

    await updateDoc(issueRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('이슈 업데이트 실패:', error);
    return false;
  }
}

/**
 * 이슈 삭제
 */
export async function deleteIssue(issueId: string): Promise<boolean> {
  try {
    const issueRef = doc(db, ISSUES_COLLECTION, issueId);
    await deleteDoc(issueRef);
    return true;
  } catch (error) {
    console.error('이슈 삭제 실패:', error);
    return false;
  }
}
