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
  Calendar as CalendarIcon,
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
  Trash2
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // 편집 상태
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoName, setEditTodoName] = useState("");
  const [editingTodoDate, setEditingTodoDate] = useState<string | null>(null);

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
  const today = new Date().toISOString().split('T')[0];

  // 현재 카테고리의 프로젝트만 필터링
  const categoryProjects = projects.filter(
    (project) => (project.category || "personal") === currentCategory
  );

  // 현재 카테고리의 프로젝트 ID 목록
  const categoryProjectIds = new Set(categoryProjects.map(p => p.id));

  // 현재 카테고리의 모든 할일 추출
  const allTodos = allTasks
    .filter(task => categoryProjectIds.has(task.projectId))
    .flatMap(task =>
      task.todos.map(todo => ({ ...todo, taskTitle: task.title, projectId: task.projectId }))
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

  // 프로젝트별로 그룹화 및 진행률 계산
  const todosByProject = categoryProjects.map(project => {
    const projectTodos = filteredTodos.filter(todo => todo.projectId === project.id);

    // 프로젝트의 모든 할일 (필터 적용 전)
    const allProjectTodos = allTodos.filter(todo => todo.projectId === project.id);

    // 프로젝트의 작업 개수
    const projectTasks = allTasks.filter(task => task.projectId === project.id);

    const projectStats = {
      total: allProjectTodos.length,
      completed: allProjectTodos.filter(t => t.status === "completed").length,
      onHold: allProjectTodos.filter(t => t.status === "on_hold").length,
      taskCount: projectTasks.length,
    };
    const projectActiveTodos = projectStats.total - projectStats.onHold;
    const projectCompletionRate = projectActiveTodos > 0
      ? Math.round((projectStats.completed / projectActiveTodos) * 100)
      : 0;

    return {
      project,
      todos: projectTodos,
      stats: {
        ...projectStats,
        activeTodos: projectActiveTodos,
        completionRate: projectCompletionRate,
      }
    };
  }).filter(group => group.todos.length > 0);

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
  const completionRate = activeTodos > 0
    ? Math.round((stats.completed / activeTodos) * 100)
    : 0;

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
  const handleTodoAction = async (todoId: string, action: "postpone" | "tomorrow" | "hold") => {
    const updates: Partial<Todo> = { updatedAt: new Date().toISOString() };
    
    switch (action) {
      case "postpone":
        // 하루 연기
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        updates.dueDate = tomorrow.toISOString().split('T')[0];
        updates.status = "todo";
        break;
      case "tomorrow":
        // 내일로
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        updates.dueDate = nextDay.toISOString().split('T')[0];
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

  // 할일 날짜 편집
  const startEditingTodoDate = (todoId: string) => {
    setEditingTodoDate(todoId);
  };

  const updateTodoDate = async (todoId: string, newDate: Date | null) => {
    const dateString = newDate ? new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0] : undefined;
    
    await updateTodoHandler(todoId, {
      dueDate: dateString,
      status: dateString ? 'todo' : 'on_hold',
      updatedAt: new Date().toISOString(),
    });

    setEditingTodoDate(null);
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

      {/* 프로젝트별 할일 목록 */}
      <div className={styles.projectsContainer}>
        {todosByProject.length === 0 ? (
          <div className={styles.emptyState}>
            <p>표시할 할일이 없습니다.</p>
          </div>
        ) : (
          todosByProject.map(({ project, todos, stats }) => (
            <div key={project.id} className={styles.projectCard}>
              <div
                className={styles.projectHeader}
                onClick={() => toggleProjectExpansion(project.id)}
              >
                <div className={styles.projectInfoWrapper}>
                  <div className={styles.projectInfo}>
                    <div
                      className={styles.projectColorBox}
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className={styles.projectName}>{project.name}</h3>
                    <div className={styles.projectChips}>
                      <span className={styles.chip}>
                        작업 {stats.taskCount}개
                      </span>
                      <span className={styles.chip}>
                        할일 {stats.total}개
                      </span>
                    </div>
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
                      {stats.completed}/{stats.activeTodos} 완료 • {stats.completionRate}%
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

              {(expandedProjects.has(project.id) || expandedProjects.size === 0) && (
                <div className={styles.todosList}>
                  {todos.map(todo => (
                    <div key={todo.id} className={styles.todoItem}>
                      <div className={styles.todoContent}>
                        <div className={styles.todoInfo}>
                          <div className={`${styles.todoStatus} ${styles[todo.status]}`} />
                          
                          <div className={styles.todoTitleRow}>
                            {editingTodoId === todo.id ? (
                              <input
                                type="text"
                                value={editTodoName}
                                onChange={(e) => setEditTodoName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveEditingTodo(todo.id);
                                  } else if (e.key === "Escape") {
                                    cancelEditingTodo();
                                  }
                                }}
                                onBlur={() => saveEditingTodo(todo.id)}
                                className={styles.editTodoInput}
                                autoFocus
                              />
                            ) : (
                              <div
                                className={styles.todoTitleWrapper}
                                onClick={() => startEditingTodo(todo.id, todo.title)}
                              >
                                <span className={styles.todoTitle}>
                                  {todo.title}
                                </span>
                                <span className={styles.taskTitle}>
                                  • {todo.taskTitle}
                                </span>
                                <Edit3 className={styles.editIcon} />
                              </div>
                            )}
                            
                            {/* 날짜 선택 영역 */}
                            <div className={styles.todoDateSection}>
                              {editingTodoDate === todo.id ? (
                                <DatePicker
                                  selected={todo.dueDate ? new Date(todo.dueDate) : null}
                                  onChange={(date) => updateTodoDate(todo.id, date)}
                                  onClickOutside={() => setEditingTodoDate(null)}
                                  placeholderText="날짜 미정"
                                  dateFormat="yyyy-MM-dd"
                                  className={styles.todoDatePickerInline}
                                  locale="ko"
                                  isClearable
                                  autoFocus
                                />
                              ) : (
                                <div
                                  className={styles.todoDateDisplay}
                                  onClick={() => startEditingTodoDate(todo.id)}
                                >
                                  {todo.dueDate ? (
                                    <span className={styles.todoDateText}>
                                      {todo.dueDate}
                                    </span>
                                  ) : (
                                    <span className={styles.todoDatePlaceholder}>
                                      보류
                                    </span>
                                  )}
                                  <CalendarIcon className={styles.todoDateIcon} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.todoControls}>
                        <div className={styles.todoProgress}>
                          <ProgressDots
                            progress={todo.progress}
                            size="sm"
                            onChange={(progress) =>
                              updateTodoHandler(todo.id, {
                                progress,
                                status: progress === 100 ? "completed" : progress > 0 ? "in_progress" : "todo",
                                updatedAt: new Date().toISOString(),
                              })
                            }
                          />
                        </div>

                        <div className={styles.todoActions}>
                          <button
                            onClick={() => handleTodoAction(todo.id, "postpone")}
                            className={styles.todoActionBtn}
                            title="미루기"
                          >
                            <Clock className="w-3 h-3" />
                            미루기
                          </button>
                          <button
                            onClick={() => handleTodoAction(todo.id, "tomorrow")}
                            className={styles.todoActionBtn}
                            title="내일로"
                          >
                            <ArrowRight className="w-3 h-3" />
                            내일로
                          </button>
                          <button
                            onClick={() => handleTodoAction(todo.id, "hold")}
                            className={styles.todoActionBtn}
                            title="보류"
                          >
                            <Pause className="w-3 h-3" />
                            보류
                          </button>
                          <button
                            onClick={() => deleteTodoHandler(todo.id)}
                            className={`${styles.todoActionBtn} ${styles.deleteBtn}`}
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                            삭제
                          </button>
                        </div>
                      </div>
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