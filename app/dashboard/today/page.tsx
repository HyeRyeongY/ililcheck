"use client";

import ProgressBar from "@/components/ui/ProgressBar";
import ProgressDots from "@/components/ui/ProgressDots";
import { useAuth } from "@/contexts/AuthContext";
import { useCategory } from "@/contexts/CategoryContext";
import {
  deleteTodo,
  fetchProjects,
  fetchTasksByProject,
  updateTodo,
} from "@/lib/api";
import { Project, Task, Todo } from "@/lib/types";
import { ko } from "date-fns/locale/ko";
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Edit3,
  LayoutGrid,
  Pause,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./page.module.css";
registerLocale("ko", ko);

type FilterType = "all" | "todo" | "in_progress" | "completed" | "on_hold";

export default function TodayPage() {
  const { user } = useAuth();
  const { currentCategory } = useCategory();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // 편집 상태
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoName, setEditTodoName] = useState("");
  const [editingStartDate, setEditingStartDate] = useState<string | null>(null);
  const [editingCompletedDate, setEditingCompletedDate] = useState<
    string | null
  >(null);

  // 사용자 데이터 로드
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setProjects([]);
        setAllTasks([]);
        setLoading(false);
        return;
      }

      try {
        const userProjects = await fetchProjects();
        setProjects(userProjects);

        // 모든 프로젝트의 작업 로드
        const allProjectTasks: Task[] = [];
        for (const project of userProjects) {
          const projectTasks = await fetchTasksByProject(project.id);
          allProjectTasks.push(...projectTasks);
        }
        setAllTasks(allProjectTasks);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 오늘 날짜
  const today = new Date().toISOString().split("T")[0];

  // 현재 카테고리의 프로젝트만 필터링
  const categoryProjects = projects.filter(
    project => (project.category || "personal") === currentCategory
  );

  // 현재 카테고리의 프로젝트 ID 목록
  const categoryProjectIds = new Set(categoryProjects.map(p => p.id));

  // 현재 카테고리의 모든 할일 추출
  const allTodos = allTasks
    .filter(task => categoryProjectIds.has(task.projectId))
    .flatMap(task =>
      task.todos.map(todo => ({
        ...todo,
        taskTitle: task.title,
        projectId: task.projectId,
      }))
    );

  // 필터링된 할일
  const filteredTodos = allTodos.filter(todo => {
    switch (activeFilter) {
      case "todo":
        return todo.status === "todo";
      case "in_progress":
        return todo.status === "in_progress";
      case "completed":
        return todo.status === "completed";
      case "on_hold":
        return todo.status === "on_hold";
      default:
        return true;
    }
  });

  // 프로젝트별로 작업과 할일을 계층 구조로 그룹화
  const projectsWithTasks = categoryProjects
    .map(project => {
      // 프로젝트의 모든 작업
      const projectTasks = allTasks.filter(
        task => task.projectId === project.id
      );

      // 각 작업의 할일을 필터링
      const tasksWithFilteredTodos = projectTasks.map(task => {
        const taskTodos = task.todos.filter(todo => {
          switch (activeFilter) {
            case "todo":
              return todo.status === "todo";
            case "in_progress":
              return todo.status === "in_progress";
            case "completed":
              return todo.status === "completed";
            case "on_hold":
              return todo.status === "on_hold";
            default:
              return true;
          }
        });

        return {
          ...task,
          filteredTodos: taskTodos,
          allTodosCount: task.todos.length,
        };
      });

      // 모든 작업 포함 (할일이 없어도 표시)
      const visibleTasks = tasksWithFilteredTodos;

      // 프로젝트 통계
      const allProjectTodos = projectTasks.flatMap(task => task.todos);
      const completedTasks = projectTasks.filter(t => t.status === "completed").length;
      const projectStats = {
        total: allProjectTodos.length,
        completed: allProjectTodos.filter(t => t.status === "completed").length,
        onHold: allProjectTodos.filter(t => t.status === "on_hold").length,
        taskCount: projectTasks.length,
        completedTasks: completedTasks,
      };
      const projectActiveTodos = projectStats.total - projectStats.onHold;
      const projectCompletionRate =
        projectActiveTodos > 0
          ? Math.round((projectStats.completed / projectActiveTodos) * 100)
          : 0;

      return {
        project,
        tasks: visibleTasks,
        stats: {
          ...projectStats,
          activeTodos: projectActiveTodos,
          completionRate: projectCompletionRate,
        },
      };
    })
    .filter(group => group.tasks.length > 0);

  // 통계 계산 (현재 카테고리 기준)
  const stats = {
    total: allTodos.length,
    todo: allTodos.filter(todo => todo.status === "todo").length,
    inProgress: allTodos.filter(todo => todo.status === "in_progress").length,
    completed: allTodos.filter(todo => todo.status === "completed").length,
    onHold: allTodos.filter(todo => todo.status === "on_hold").length,
  };

  // 진행률 계산 (보류 제외)
  const activeTodos = stats.total - stats.onHold;
  const completionRate =
    activeTodos > 0 ? Math.round((stats.completed / activeTodos) * 100) : 0;

  // 할일 업데이트
  const updateTodoHandler = async (todoId: string, updates: Partial<Todo>) => {
    try {
      await updateTodo(todoId, updates);
      // 데이터 새로고침
      const userProjects = await fetchProjects();
      const allProjectTasks: Task[] = [];
      for (const project of userProjects) {
        const projectTasks = await fetchTasksByProject(project.id);
        allProjectTasks.push(...projectTasks);
      }
      setAllTasks(allProjectTasks);
    } catch (error) {
      console.error("할일 업데이트 실패:", error);
    }
  };

  // 할일 삭제
  const deleteTodoHandler = async (todoId: string) => {
    try {
      await deleteTodo(todoId);
      // 데이터 새로고침
      const userProjects = await fetchProjects();
      const allProjectTasks: Task[] = [];
      for (const project of userProjects) {
        const projectTasks = await fetchTasksByProject(project.id);
        allProjectTasks.push(...projectTasks);
      }
      setAllTasks(allProjectTasks);
    } catch (error) {
      console.error("할일 삭제 실패:", error);
    }
  };

  // 할일 액션 (미루기, 내일로, 보류)
  const handleTodoAction = async (
    todoId: string,
    action: "postpone" | "tomorrow" | "hold"
  ) => {
    const updates: Partial<Todo> = { updatedAt: new Date().toISOString() };

    switch (action) {
      case "postpone":
        // 하루 연기
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        updates.dueDate = tomorrow.toISOString().split("T")[0];
        updates.status = "todo";
        break;
      case "tomorrow":
        // 내일로
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        updates.dueDate = nextDay.toISOString().split("T")[0];
        updates.status = "todo";
        break;
      case "hold":
        // 보류
        updates.dueDate = undefined;
        updates.status = "on_hold";
        break;
    }

    await updateTodoHandler(todoId, updates);
  };

  // 할일 편집
  const startEditingTodo = (todoId: string, currentTitle: string) => {
    setEditingTodoId(todoId);
    setEditTodoName(currentTitle);
  };

  const saveEditingTodo = async (todoId: string) => {
    if (!editTodoName.trim()) return;

    await updateTodoHandler(todoId, {
      title: editTodoName.trim(),
      updatedAt: new Date().toISOString(),
    });

    setEditingTodoId(null);
    setEditTodoName("");
  };

  const cancelEditingTodo = () => {
    setEditingTodoId(null);
    setEditTodoName("");
  };

  // 할일 시작일 편집
  const startEditingStartDate = (todoId: string) => {
    setEditingStartDate(todoId);
  };

  const updateStartDate = async (todoId: string, newDate: Date | null) => {
    const dateString = newDate
      ? new Date(
          newDate.getTime() - newDate.getTimezoneOffset() * 60000
        ).toISOString()
      : undefined;

    await updateTodoHandler(todoId, {
      startDate: dateString,
      updatedAt: new Date().toISOString(),
    });

    setEditingStartDate(null);
  };

  // 할일 완료일 편집
  const startEditingCompletedDate = (todoId: string) => {
    setEditingCompletedDate(todoId);
  };

  const updateCompletedDate = async (todoId: string, newDate: Date | null) => {
    const dateString = newDate
      ? new Date(
          newDate.getTime() - newDate.getTimezoneOffset() * 60000
        ).toISOString()
      : undefined;

    await updateTodoHandler(todoId, {
      completedDate: dateString,
      updatedAt: new Date().toISOString(),
    });

    setEditingCompletedDate(null);
  };

  // 프로젝트 확장/축소
  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // 작업 확장/축소
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  const todayDate = new Date();
  const dateString = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일 ${
    ["일", "월", "화", "수", "목", "금", "토"][todayDate.getDay()]
  }요일`;

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <div className={styles.categoryIndicator} />
            <h1 className={styles.title}>
              오늘의 할일 - {currentCategory === "personal" ? "개인" : "업무"}
            </h1>
          </div>
          <p className={styles.date}>{dateString}</p>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className={styles.content}>
        {/* 진행률 */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <h3 className={styles.progressTitle}>완료율</h3>
            <span className={styles.progressText}>
              {stats.completed}/{activeTodos} 완료 • {completionRate}%
            </span>
          </div>
          <div className={styles.progressBarWrapper}>
            <ProgressBar progress={completionRate} />
          </div>
        </div>

        {/* 필터 버튼 */}
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${activeFilter === "all" ? styles.active : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <LayoutGrid className="w-4 h-4" />
            전체 {stats.total}
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterTodo} ${activeFilter === "todo" ? styles.active : ""}`}
            onClick={() => setActiveFilter("todo")}
          >
            <Circle className="w-4 h-4" />
            시작 전 {stats.todo}
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterInProgress} ${activeFilter === "in_progress" ? styles.active : ""}`}
            onClick={() => setActiveFilter("in_progress")}
          >
            <PlayCircle className="w-4 h-4" />
            진행 중 {stats.inProgress}
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterCompleted} ${activeFilter === "completed" ? styles.active : ""}`}
            onClick={() => setActiveFilter("completed")}
          >
            <CheckCircle className="w-4 h-4" />
            완료 {stats.completed}
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterOnHold} ${activeFilter === "on_hold" ? styles.active : ""}`}
            onClick={() => setActiveFilter("on_hold")}
          >
            <PauseCircle className="w-4 h-4" />
            보류 {stats.onHold}
          </button>
        </div>

        {/* 프로젝트별 작업 및 할일 목록 */}
        <div className={styles.projectsContainer}>
          {projectsWithTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>표시할 할일이 없습니다.</p>
            </div>
          ) : (
            projectsWithTasks.map(({ project, tasks, stats }) => (
              <div key={project.id} className={styles.projectCard}>
                <div
                  className={styles.projectHeader}
                  onClick={() => toggleProjectExpansion(project.id)}
                >
                  <div
                    className={styles.projectColorBox}
                    style={{ backgroundColor: project.color }}
                  />
                  <div className={styles.projectHeaderContents}>
                    <div className={styles.projectInfoWrapper}>
                      <div className={styles.projectInfo}>
                        <h3 className={styles.projectName}>{project.name}</h3>
                        <div className={styles.projectChips}>
                          <span className={styles.chip}>
                            작업 {stats.completedTasks}/{stats.taskCount}
                          </span>
                          <span className={styles.chip}>
                            할일 {stats.completed}/{stats.total}
                          </span>
                        </div>
                      </div>
                      <button className={styles.expandButton}>
                        {expandedProjects.has(project.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className={styles.projectProgressInfo}>
                      <div className={styles.projectProgressBarWrapper}>
                        <ProgressBar
                          progress={stats.completionRate}
                          color={project.color}
                          showLabel={false}
                          size="sm"
                        />
                      </div>
                      <span className={styles.projectProgressText}>
                        {stats.completed}/{stats.activeTodos} 완료 •{" "}
                        {stats.completionRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {(expandedProjects.has(project.id) ||
                  expandedProjects.size === 0) && (
                  <div className={styles.tasksList}>
                    {tasks.map(task => (
                      <div key={task.id} className={styles.taskSection}>
                        {/* 작업 헤더 */}
                        <div
                          className={styles.taskHeader}
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          <button className={styles.taskExpandButton}>
                            {expandedTasks.has(task.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div className={styles.taskHeaderContent}>
                            <div className={styles.taskTitleRow}>
                              <h4 className={styles.taskTitle}>{task.title}</h4>
                              <span className={styles.taskTodoCount}>
                                {task.filteredTodos.length}개
                              </span>
                            </div>
                            <div className={styles.taskStats}>
                              <div className={styles.taskProgressBarWrapper}>
                                <ProgressBar
                                  progress={task.progress}
                                  showLabel={false}
                                  size="sm"
                                />
                              </div>
                              <span className={styles.taskProgressText}>
                                {task.progress}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 작업의 할일 목록 */}
                        {expandedTasks.has(task.id) && (
                          <div className={styles.todosList}>
                            {task.filteredTodos.length === 0 ? (
                              <div className={styles.emptyTaskTodos}>
                                할일이 없습니다.
                              </div>
                            ) : (
                              task.filteredTodos.map(todo => (
                                <div key={todo.id} className={styles.todoItem}>
                                  <div className={styles.todoContent}>
                                    <div className={styles.todoInfo}>
                                      <div
                                        className={`${styles.todoStatus} ${styles[todo.status]}`}
                                      />

                                      <div className={styles.todoTitleRow}>
                                        {editingTodoId === todo.id ? (
                                          <input
                                            type="text"
                                            value={editTodoName}
                                            onChange={e =>
                                              setEditTodoName(e.target.value)
                                            }
                                            onKeyDown={e => {
                                              if (e.key === "Enter") {
                                                saveEditingTodo(todo.id);
                                              } else if (e.key === "Escape") {
                                                cancelEditingTodo();
                                              }
                                            }}
                                            onBlur={() =>
                                              saveEditingTodo(todo.id)
                                            }
                                            className={styles.editTodoInput}
                                            autoFocus
                                          />
                                        ) : (
                                          <div
                                            className={styles.todoTitleWrapper}
                                            onClick={() =>
                                              startEditingTodo(
                                                todo.id,
                                                todo.title
                                              )
                                            }
                                          >
                                            <span className={styles.todoTitle}>
                                              {todo.title}
                                            </span>
                                            <Edit3
                                              className={styles.editIcon}
                                            />
                                          </div>
                                        )}

                                        {/* 시작일/완료일 선택 및 표시 */}
                                        <div className={styles.todoDateSection}>
                                          <div className={styles.todoDateInfo}>
                                            {/* 시작일 */}
                                            {editingStartDate === todo.id ? (
                                              <DatePicker
                                                selected={
                                                  todo.startDate
                                                    ? new Date(todo.startDate)
                                                    : null
                                                }
                                                onChange={date =>
                                                  updateStartDate(todo.id, date)
                                                }
                                                onClickOutside={() =>
                                                  setEditingStartDate(null)
                                                }
                                                placeholderText="시작일 선택"
                                                dateFormat="yyyy-MM-dd"
                                                className={
                                                  styles.todoDatePickerInline
                                                }
                                                locale="ko"
                                                isClearable
                                                autoFocus
                                              />
                                            ) : (
                                              <span
                                                className={`${styles.todoDateLabel} ${styles.clickable}`}
                                                onClick={() =>
                                                  startEditingStartDate(todo.id)
                                                }
                                                title="클릭하여 시작일 설정"
                                              >
                                                시작:{" "}
                                                {todo.startDate
                                                  ? new Date(
                                                      todo.startDate
                                                    ).toLocaleDateString(
                                                      "ko-KR",
                                                      {
                                                        month: "short",
                                                        day: "numeric",
                                                      }
                                                    )
                                                  : "-"}
                                              </span>
                                            )}

                                            {/* 완료일 */}
                                            {editingCompletedDate ===
                                            todo.id ? (
                                              <DatePicker
                                                selected={
                                                  todo.completedDate
                                                    ? new Date(
                                                        todo.completedDate
                                                      )
                                                    : null
                                                }
                                                onChange={date =>
                                                  updateCompletedDate(
                                                    todo.id,
                                                    date
                                                  )
                                                }
                                                onClickOutside={() =>
                                                  setEditingCompletedDate(null)
                                                }
                                                placeholderText="완료일 선택"
                                                dateFormat="yyyy-MM-dd"
                                                className={
                                                  styles.todoDatePickerInline
                                                }
                                                locale="ko"
                                                isClearable
                                                autoFocus
                                              />
                                            ) : (
                                              <span
                                                className={`${styles.todoDateLabel} ${styles.clickable}`}
                                                onClick={() =>
                                                  startEditingCompletedDate(
                                                    todo.id
                                                  )
                                                }
                                                title="클릭하여 완료일 설정"
                                              >
                                                완료:{" "}
                                                {todo.completedDate
                                                  ? new Date(
                                                      todo.completedDate
                                                    ).toLocaleDateString(
                                                      "ko-KR",
                                                      {
                                                        month: "short",
                                                        day: "numeric",
                                                      }
                                                    )
                                                  : "-"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className={styles.todoControls}>
                                    <div className={styles.todoProgress}>
                                      <ProgressDots
                                        progress={todo.progress}
                                        size="sm"
                                        onChange={progress => {
                                          const updates: Partial<Todo> = {
                                            progress,
                                            status:
                                              progress === 100
                                                ? "completed"
                                                : progress > 0
                                                  ? "in_progress"
                                                  : "todo",
                                            updatedAt: new Date().toISOString(),
                                          };

                                          // 시작일 자동 설정 (0%에서 처음 시작할 때)
                                          if (todo.progress === 0 && progress > 0 && !todo.startDate) {
                                            updates.startDate = new Date().toISOString();
                                          }

                                          // 시작일 초기화 (진행률이 0으로 돌아갈 때)
                                          if (progress === 0 && todo.startDate) {
                                            updates.startDate = undefined;
                                          }

                                          // 완료일 자동 설정
                                          if (progress === 100 && !todo.completedDate) {
                                            updates.completedDate = new Date().toISOString();
                                          }

                                          // 완료일 초기화 (진행률이 100 미만으로 낮아질 때)
                                          if (progress < 100 && todo.completedDate) {
                                            updates.completedDate = undefined;
                                          }

                                          updateTodoHandler(todo.id, updates);
                                        }}
                                      />
                                    </div>

                                    <div className={styles.todoActions}>
                                      <button
                                        onClick={() =>
                                          handleTodoAction(todo.id, "postpone")
                                        }
                                        className={styles.todoActionBtn}
                                        title="미루기"
                                      >
                                        <Clock className="w-3 h-3" />
                                        미루기
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleTodoAction(todo.id, "tomorrow")
                                        }
                                        className={styles.todoActionBtn}
                                        title="내일로"
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                        내일로
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleTodoAction(todo.id, "hold")
                                        }
                                        className={styles.todoActionBtn}
                                        title="보류"
                                      >
                                        <Pause className="w-3 h-3" />
                                        보류
                                      </button>
                                      <button
                                        onClick={() =>
                                          deleteTodoHandler(todo.id)
                                        }
                                        className={`${styles.todoActionBtn} ${styles.deleteBtn}`}
                                        title="삭제"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
