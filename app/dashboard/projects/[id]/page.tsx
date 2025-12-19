"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DonutChart from "@/components/ui/DonutChart";
import ProgressDots from "@/components/ui/ProgressDots";
import EditProjectDrawer from "@/components/modals/EditProjectDrawer";
import { useAuth } from "@/contexts/AuthContext";
import {
  createIssue,
  createTask,
  createTodo,
  deleteIssue,
  deleteProject,
  deleteTask,
  deleteTodo,
  fetchIssuesByProject,
  fetchProjects,
  fetchTasksByProject,
  updateIssue,
  updateProject,
  updateTask,
  updateTodo,
} from "@/lib/api";
import { Issue, Project, ProjectCategory, Task, Todo } from "@/lib/types";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ko } from "date-fns/locale/ko";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Edit3,
  GripVertical,
  MessageCircleWarning,
  MoreVertical,
  MousePointer2,
  Notebook,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./page.module.css";
registerLocale("ko", ko);

// Sortable Task 컴포넌트
interface SortableTaskProps {
  task: Task;
  isExpanded: boolean;
  editingTaskId: string | null;
  editTaskName: string;
  isAddingTodo: string | null;
  newTodoName: string;
  editingTodoId: string | null;
  editTodoName: string;
  editingTodoDate: string | null;
  onToggleExpansion: (taskId: string) => void;
  onStartEditingTask: (taskId: string, title: string) => void;
  onSaveEditingTask: (taskId: string) => void;
  onCancelEditingTask: () => void;
  onTaskDelete: (taskId: string, title: string) => void;
  onUpdateTaskProgress: (taskId: string, progress?: number) => void;
  onCreateTodo: (taskId: string) => void;
  onStartEditingTodo: (taskId: string, todoId: string, title: string) => void;
  onSaveEditingTodo: (taskId: string, todoId: string) => void;
  onCancelEditingTodo: () => void;
  onUpdateTodoProgress: (
    taskId: string,
    todoId: string,
    progress: number
  ) => void;
  onStartEditingTodoDate: (todoId: string) => void;
  onCancelEditingTodoDate: () => void;
  onUpdateTodoStartDate: (
    taskId: string,
    todoId: string,
    date: Date | null
  ) => void;
  onTodoDelete: (taskId: string, todoId: string) => void;
  setIsAddingTodo: (taskId: string | null) => void;
  setNewTodoName: (name: string) => void;
  setEditTaskName: (name: string) => void;
  setEditTodoName: (name: string) => void;
  projectColor: string;
  sortableTodos?: React.ReactNode;
}

const SortableTask: React.FC<SortableTaskProps> = ({
  task,
  isExpanded,
  editingTaskId,
  editTaskName,
  isAddingTodo,
  newTodoName,
  editingTodoId,
  editTodoName,
  editingTodoDate,
  onToggleExpansion,
  onStartEditingTask,
  onSaveEditingTask,
  onCancelEditingTask,
  onTaskDelete,
  onUpdateTaskProgress,
  onCreateTodo,
  onStartEditingTodo,
  onSaveEditingTodo,
  onCancelEditingTodo,
  onUpdateTodoProgress,
  onStartEditingTodoDate,
  onCancelEditingTodoDate,
  onUpdateTodoStartDate,
  onTodoDelete,
  setIsAddingTodo,
  setNewTodoName,
  setEditTaskName,
  setEditTodoName,
  projectColor,
  sortableTodos,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    // 드래그 중에도 원래 높이 유지하여 레이아웃 안정성 확보
    visibility: isDragging ? "hidden" : "visible",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.taskItem} ${isExpanded ? styles.taskItemExpanded : ""}`}
    >
      <div
        className={`${styles.taskHeader} ${styles.taskHeaderClickable}`}
        onClick={e => {
          const target = e.target as HTMLElement;
          if (
            !target.closest("button") &&
            !target.closest("input") &&
            !target.closest(`.${styles.dragHandle}`)
          ) {
            onToggleExpansion(task.id);
          }
        }}
      >
        {/* Drag Handle */}
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4" />
        </div>

        <div className={styles.taskHeaderContent}>
          {/* 위 행: 토글 + 제목 + 할일추가 */}
          <div className={styles.taskHeaderTop}>
            <button
              onClick={() => onToggleExpansion(task.id)}
              className={styles.taskToggle}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <div className={styles.taskTitleSection}>
              <div className={styles.taskProgressCircle}>
                <DonutChart
                  progress={task.progress}
                  size="xs"
                  color={
                    task.progress === 100
                      ? "#3b82f6"
                      : task.progress > 40
                        ? "#34d399"
                        : task.progress > 0
                          ? "#fbbf24"
                          : "#e5e7eb"
                  }
                  showLabel={false}
                />
                <span
                  className={styles.taskProgressPercent}
                  style={{
                    color:
                      task.progress === 100
                        ? "#3b82f6"
                        : task.progress > 40
                          ? "#34d399"
                          : task.progress > 0
                            ? "#fbbf24"
                            : "#9ca3af",
                  }}
                >
                  {task.progress}
                </span>
              </div>

              {editingTaskId === task.id ? (
                <input
                  type="text"
                  value={editTaskName}
                  onChange={e => setEditTaskName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      onSaveEditingTask(task.id);
                    } else if (e.key === "Escape") {
                      onCancelEditingTask();
                    }
                  }}
                  onBlur={() => onSaveEditingTask(task.id)}
                  className={styles.editTaskInput}
                  autoFocus
                />
              ) : (
                <div
                  className={styles.taskTitleWrapper}
                  onClick={() => onStartEditingTask(task.id, task.title)}
                >
                  <h4 className={styles.taskTitle}>{task.title}</h4>
                  <Edit3 className={styles.editIcon} />
                </div>
              )}
            </div>

            {task.todos.length === 0 && (
              <div className={styles.taskProgressContainer}>
                <ProgressDots
                  progress={task.progress}
                  size="sm"
                  onChange={progress => onUpdateTaskProgress(task.id, progress)}
                />
              </div>
            )}

            <div className={styles.todoBadge}>
              {task.todos.length > 0
                ? `할 일 ${
                    task.todos.filter(t => t.status === "completed").length
                  }/${task.todos.length}`
                : "할 일 없음"}
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                onTaskDelete(task.id, task.title);
              }}
              className={styles.deleteTaskBtn}
              title="작업 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* 아래 행*/}
          <div className={styles.taskHeaderBottom}></div>
        </div>
      </div>

      {/* 확장된 할일 목록 */}
      {isExpanded && sortableTodos}
    </div>
  );
};

// Sortable Todo 컴포넌트
interface SortableTodoProps {
  todo: Todo;
  taskId: string;
  editingTodoId: string | null;
  editTodoName: string;
  editingTodoDate: string | null;
  expandedTodoDate: string | null;
  onStartEditingTodo: (taskId: string, todoId: string, title: string) => void;
  onSaveEditingTodo: (taskId: string, todoId: string) => void;
  onCancelEditingTodo: () => void;
  onUpdateTodoProgress: (
    taskId: string,
    todoId: string,
    progress: number
  ) => void;
  onStartEditingTodoDate: (todoId: string) => void;
  onCancelEditingTodoDate: () => void;
  onToggleDateExpansion: (todoId: string | null) => void;
  onUpdateTodoStartDate: (
    taskId: string,
    todoId: string,
    date: Date | null
  ) => void;
  onUpdateTodoCompletedDate: (
    taskId: string,
    todoId: string,
    date: Date | null
  ) => void;
  onTodoDelete: (taskId: string, todoId: string) => void;
  setEditTodoName: (name: string) => void;
}

const SortableTodo: React.FC<SortableTodoProps> = ({
  todo,
  taskId,
  editingTodoId,
  editTodoName,
  editingTodoDate,
  expandedTodoDate,
  onStartEditingTodo,
  onSaveEditingTodo,
  onCancelEditingTodo,
  onUpdateTodoProgress,
  onStartEditingTodoDate,
  onCancelEditingTodoDate,
  onToggleDateExpansion,
  onUpdateTodoStartDate,
  onUpdateTodoCompletedDate,
  onTodoDelete,
  setEditTodoName,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    // 드래그 중에도 원래 높이 유지하여 레이아웃 안정성 확보
    visibility: isDragging ? "hidden" : "visible",
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.todoCard}>
      {/* Drag Handle */}
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <CornerDownRight size={12} className={styles.icon} />

      <div className={styles.todoProgressCircle}>
        <DonutChart
          progress={todo.progress}
          size="xs"
          color={
            todo.progress === 100
              ? "#3b82f6"
              : todo.progress > 40
                ? "#34d399"
                : todo.progress > 0
                  ? "#fbbf24"
                  : "#e5e7eb"
          }
          showLabel={false}
        />
        <span
          className={styles.progressPercent}
          style={{
            color:
              todo.progress === 100
                ? "#3b82f6"
                : todo.progress > 40
                  ? "#34d399"
                  : todo.progress > 0
                    ? "#fbbf24"
                    : "#9ca3af",
          }}
        >
          {todo.progress}
        </span>
      </div>
      {editingTodoId === todo.id ? (
        <input
          type="text"
          value={editTodoName}
          onChange={e => setEditTodoName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              onSaveEditingTodo(taskId, todo.id);
            } else if (e.key === "Escape") {
              onCancelEditingTodo();
            }
          }}
          className={styles.editTodoInput}
          autoFocus
        />
      ) : (
        <div
          className={styles.todoCardTitleWrapper}
          onClick={() => onStartEditingTodo(taskId, todo.id, todo.title)}
        >
          <span
            className={`${styles.todoCardTitle} ${
              todo.status === "completed" ? styles.completed : ""
            }`}
          >
            {todo.title}
          </span>
          <Edit3 className={styles.editIcon} />
        </div>
      )}
      <div className={styles.todoCardProgress}>
        <ProgressDots
          progress={todo.progress}
          size="sm"
          onChange={progress => onUpdateTodoProgress(taskId, todo.id, progress)}
        />
      </div>
      <div className={styles.todoCardDates}>
        {expandedTodoDate === todo.id ? (
          <div className={styles.todoDateExpanded}>
            <div className={styles.todoDateRow}>
              <span className={styles.todoDateRowLabel}>시작일:</span>
              {editingTodoDate === `${todo.id}-start` ? (
                <DatePicker
                  selected={todo.startDate ? new Date(todo.startDate) : null}
                  onChange={date => {
                    onUpdateTodoStartDate(taskId, todo.id, date);
                    onCancelEditingTodoDate();
                  }}
                  onClickOutside={() => onCancelEditingTodoDate()}
                  placeholderText="선택"
                  dateFormat="yyyy-MM-dd"
                  className={styles.todoDatePickerInline}
                  locale="ko"
                  isClearable
                  autoFocus
                />
              ) : (
                <>
                  <span className={styles.todoDateRowValue}>
                    {todo.startDate
                      ? new Date(todo.startDate).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </span>
                  <button
                    className={styles.todoDateEditBtn}
                    onClick={() => onStartEditingTodoDate(`${todo.id}-start`)}
                    title="시작일 수정"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            <div className={styles.todoDateRow}>
              <span className={styles.todoDateRowLabel}>완료일:</span>
              {editingTodoDate === `${todo.id}-completed` ? (
                <DatePicker
                  selected={
                    todo.completedDate ? new Date(todo.completedDate) : null
                  }
                  onChange={date => {
                    onUpdateTodoCompletedDate(taskId, todo.id, date);
                    onCancelEditingTodoDate();
                  }}
                  onClickOutside={() => onCancelEditingTodoDate()}
                  placeholderText="선택"
                  dateFormat="yyyy-MM-dd"
                  className={styles.todoDatePickerInline}
                  locale="ko"
                  isClearable
                  autoFocus
                />
              ) : (
                <>
                  <span className={styles.todoDateRowValue}>
                    {todo.completedDate
                      ? new Date(todo.completedDate).toLocaleDateString(
                          "ko-KR",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )
                      : "-"}
                  </span>
                  <button
                    className={styles.todoDateEditBtn}
                    onClick={() =>
                      onStartEditingTodoDate(`${todo.id}-completed`)
                    }
                    title="완료일 수정"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            <button
              className={styles.todoDateCollapseBtn}
              onClick={() => onToggleDateExpansion(null)}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            className={`${styles.todoDateIcon} ${todo.startDate || todo.completedDate ? styles.hasDate : ""}`}
            onClick={() => onToggleDateExpansion(todo.id)}
            title="날짜 정보 보기"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <button
        onClick={() => onTodoDelete(taskId, todo.id)}
        className={styles.todoCardDeleteBtn}
        title="삭제"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

type ViewMode = "manage" | "summary";

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("manage");
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // 이슈 관련 상태
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "medium" as Issue["priority"],
    status: "open" as Issue["status"],
  });
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

  // 작업 편집 상태
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");

  // 할일 상태
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isAddingTodo, setIsAddingTodo] = useState<string | null>(null);
  const [newTodoName, setNewTodoName] = useState("");

  // 편집 상태
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTodoName, setEditTodoName] = useState("");
  const [editingTodoDate, setEditingTodoDate] = useState<string | null>(null);
  const [expandedTodoDate, setExpandedTodoDate] = useState<string | null>(null);

  // 드래그 앤 드롭 상태
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);

  // 팝업 상태
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    type?: "info" | "success" | "warning" | "error";
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 작업 드래그 시작 핸들러
  const handleTaskDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  // 작업 드래그 앤 드롭 핸들러
  const handleTaskDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTaskId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex(task => task.id === active.id);
    const newIndex = tasks.findIndex(task => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);

    // 로컬 상태 즉시 업데이트
    setTasks(reorderedTasks);

    // Firebase에 순서 업데이트 (비동기)
    try {
      const updatePromises = reorderedTasks.map((task, index) =>
        updateTask(task.id, { order: index })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("작업 순서 업데이트 실패:", error);
      // 실패 시 원래 순서로 복원
      await reloadTasks();
    }
  };

  // 할일 드래그 시작 핸들러
  const handleTodoDragStart = (event: DragStartEvent) => {
    setActiveTodoId(event.active.id as string);
  };

  // 할일 드래그 앤 드롭 핸들러
  const handleTodoDragEnd = (taskId: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTodoId(null);

    if (!over || active.id === over.id) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldIndex = task.todos.findIndex(todo => todo.id === active.id);
    const newIndex = task.todos.findIndex(todo => todo.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTodos = arrayMove(task.todos, oldIndex, newIndex);

    // 로컬 상태 즉시 업데이트
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, todos: reorderedTodos } : t
    );
    setTasks(updatedTasks);

    // Firebase에 순서 업데이트 (비동기)
    (async () => {
      try {
        const updatePromises = reorderedTodos.map((todo, index) =>
          updateTodo(todo.id, { order: index })
        );
        await Promise.all(updatePromises);
      } catch (error) {
        console.error("할일 순서 업데이트 실패:", error);
        // 실패 시 원래 순서로 복원
        await reloadTasks();
      }
    })();
  };

  useEffect(() => {
    async function loadData() {
      if (!user || !params.id) {
        setProject(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        const allProjects = await fetchProjects();

        const currentProject = allProjects.find(p => p.id === params.id);
        setProject(currentProject || null);

        // 프로젝트에 대한 작업 목록 불러오기 (Firebase에서)
        try {
          const projectTasks = await fetchTasksByProject(params.id as string);
          setTasks(projectTasks);

          // 작업 목록을 가져온 후 프로젝트 진행률 동기화
          if (currentProject && projectTasks.length > 0) {
            const totalProgress = projectTasks.reduce(
              (sum, task) => sum + task.progress,
              0
            );
            const averageProgress = Math.round(
              totalProgress / projectTasks.length
            );
            const completedTasks = projectTasks.filter(
              t => t.status === "completed"
            ).length;
            const totalTasks = projectTasks.length;

            // Firebase의 진행률과 실제 작업 진행률이 다르면 업데이트
            if (
              currentProject.progress !== averageProgress ||
              currentProject.completedTasks !== completedTasks ||
              currentProject.totalTasks !== totalTasks
            ) {
              await updateProject(params.id as string, {
                progress: averageProgress,
                completedTasks,
                totalTasks,
              });

              // 사이드바에 프로젝트 업데이트 알림
              window.dispatchEvent(
                new CustomEvent("projectUpdated", {
                  detail: {
                    projectId: params.id,
                    updates: {
                      progress: averageProgress,
                      completedTasks,
                      totalTasks,
                    },
                  },
                })
              );
            }
          } else if (currentProject && projectTasks.length === 0) {
            // 작업이 없는 경우
            if (
              currentProject.progress !== 0 ||
              currentProject.completedTasks !== 0 ||
              currentProject.totalTasks !== 0
            ) {
              await updateProject(params.id as string, {
                progress: 0,
                completedTasks: 0,
                totalTasks: 0,
              });

              // 사이드바에 프로젝트 업데이트 알림
              window.dispatchEvent(
                new CustomEvent("projectUpdated", {
                  detail: {
                    projectId: params.id,
                    updates: { progress: 0, completedTasks: 0, totalTasks: 0 },
                  },
                })
              );
            }
          }
        } catch (error) {
          console.error("작업 목록 로드 실패:", error);
          setTasks([]);
        }

        // 이슈 목록 불러오기
        try {
          const projectIssues = await fetchIssuesByProject(params.id as string);
          setIssues(projectIssues);
        } catch (error) {
          console.error("이슈 목록 로드 실패:", error);
          setIssues([]);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, params.id]);

  // 할일 제목 편집 시 외부 클릭 감지
  useEffect(() => {
    if (!editingTodoId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 편집 중인 input이 아닌 곳을 클릭하면 저장
      if (!target.closest(`.${styles.editTodoInput}`)) {
        const taskId = tasks.find(t =>
          t.todos.some(todo => todo.id === editingTodoId)
        )?.id;
        if (taskId) {
          saveEditingTodo(taskId, editingTodoId);
        }
      }
    };

    // 약간의 지연을 두고 이벤트 리스너 추가 (input이 마운트된 후)
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingTodoId, tasks, editTodoName]);

  // 저장 확인 함수
  // drawer에서 프로젝트 수정 성공 시
  const handleEditSuccess = async () => {
    // 프로젝트 정보 새로고침
    if (params.id) {
      try {
        const allProjects = await fetchProjects();
        const currentProject = allProjects.find(p => p.id === params.id);
        if (currentProject) {
          setProject(currentProject);

          // 사이드바에 프로젝트 업데이트 알림
          window.dispatchEvent(
            new CustomEvent("projectUpdated", {
              detail: { projectId: params.id, updates: currentProject },
            })
          );
        }
      } catch (error) {
        console.error("프로젝트 정보 새로고침 실패:", error);
      }
    }
  };

  // drawer에서 프로젝트 삭제 성공 시
  const handleDeleteSuccess = () => {
    // 대시보드로 이동
    window.location.href = "/dashboard";
  };

  // Firebase에서 최신 작업 목록 다시 로드
  const reloadTasks = async (): Promise<Task[]> => {
    if (!params.id) return [];
    try {
      const projectTasks = await fetchTasksByProject(params.id as string);
      setTasks(projectTasks);
      return projectTasks;
    } catch (error) {
      console.error("작업 목록 새로고침 실패:", error);
      return [];
    }
  };

  // 프로젝트 진행률 업데이트 (작업 진행률의 평균)
  const updateProjectProgress = async (updatedTasks: Task[]) => {
    if (!project || !params.id) return;

    // 작업이 없는 경우 처리
    if (updatedTasks.length === 0) {
      try {
        await updateProject(params.id as string, {
          progress: 0,
          completedTasks: 0,
          totalTasks: 0,
        });

        // 사이드바에 프로젝트 업데이트 알림
        window.dispatchEvent(
          new CustomEvent("projectUpdated", {
            detail: {
              projectId: params.id,
              updates: { progress: 0, completedTasks: 0, totalTasks: 0 },
            },
          })
        );
      } catch (error) {
        console.error("프로젝트 진행률 업데이트 실패:", error);
      }
      return;
    }

    // 작업 진행률의 평균 계산
    const totalProgress = updatedTasks.reduce(
      (sum, task) => sum + task.progress,
      0
    );
    const averageProgress = Math.round(totalProgress / updatedTasks.length);
    const completedTasks = updatedTasks.filter(
      t => t.status === "completed"
    ).length;
    const totalTasks = updatedTasks.length;

    // 프로젝트 상태 업데이트
    const updatedProject = {
      ...project,
      progress: averageProgress,
      completedTasks,
      totalTasks,
    };
    setProject(updatedProject);

    // Firebase에 프로젝트 진행률 저장
    try {
      await updateProject(params.id as string, {
        progress: averageProgress,
        completedTasks,
        totalTasks,
      });

      // 사이드바에 프로젝트 업데이트 알림
      window.dispatchEvent(
        new CustomEvent("projectUpdated", {
          detail: {
            projectId: params.id,
            updates: { progress: averageProgress, completedTasks, totalTasks },
          },
        })
      );
    } catch (error) {
      console.error("프로젝트 진행률 업데이트 실패:", error);
    }
  };

  // 새 작업 추가 시작
  const handleAddNewTask = () => {
    setIsAddingTask(true);
    setNewTaskName("");
  };

  // 새 작업 추가 취소
  const cancelAddNewTask = () => {
    setIsAddingTask(false);
    setNewTaskName("");
  };

  // 새 작업 생성
  const createNewTask = async () => {
    if (!project || !params.id || !newTaskName.trim()) {
      return;
    }

    try {
      // Firebase에 새 작업 생성
      const taskId = await createTask({
        projectId: params.id as string,
        title: newTaskName.trim(),
        status: "todo",
        progress: 0,
        createdAt: new Date().toISOString(),
        todos: [],
      });

      if (taskId) {
        // 작업 목록 새로고침
        await reloadTasks();

        setIsAddingTask(false);
        setNewTaskName("");

        setDialog({
          isOpen: true,
          title: "생성 완료",
          message: `"${newTaskName.trim()}" 작업이 생성되었습니다.`,
          type: "success",
          onConfirm: () => {
            setDialog(prev => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        throw new Error("작업 생성 실패");
      }
    } catch (error) {
      console.error("작업 생성 실패:", error);
      setDialog({
        isOpen: true,
        title: "생성 실패",
        message: "작업 생성에 실패했습니다. 다시 시도해주세요.",
        type: "error",
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  // 작업 확장/축소 토글
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

  // 새 할일 추가
  const createNewTodo = async (taskId: string) => {
    if (!newTodoName.trim()) return;

    try {
      // 현재 작업의 할일 개수를 확인하여 order 값 설정
      const task = tasks.find(t => t.id === taskId);
      const order = task ? task.todos.length : 0;

      // Firebase에 새 할일 생성
      const todoId = await createTodo({
        taskId,
        title: newTodoName.trim(),
        status: "todo",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order,
      });

      if (todoId) {
        // 작업 목록 새로고침
        await reloadTasks();

        setIsAddingTodo(null);
        setNewTodoName("");
      } else {
        throw new Error("할일 생성 실패");
      }
    } catch (error) {
      console.error("할일 생성 실패:", error);
      setDialog({
        isOpen: true,
        title: "생성 실패",
        message: "할일 생성에 실패했습니다. 다시 시도해주세요.",
        type: "error",
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  // 할일 진행률 업데이트
  const updateTodoProgress = async (
    taskId: string,
    todoId: string,
    progress: number
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const tasksCopy = [...tasks];
    const taskIndex = tasksCopy.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const todoIndex = tasksCopy[taskIndex].todos.findIndex(
      t => t.id === todoId
    );
    if (todoIndex === -1) return;

    const oldTodo = tasksCopy[taskIndex].todos[todoIndex];

    const updates: Partial<Todo> = {
      progress,
      status:
        progress === 100 ? "completed" : progress > 0 ? "in_progress" : "todo",
      updatedAt: new Date().toISOString(),
    };

    // 시작일 자동 설정
    if (oldTodo.progress === 0 && progress > 0) {
      updates.startDate = today;
    }

    // 시작일 초기화 (진행률이 0으로 돌아갈 때)
    if (progress === 0 && oldTodo.startDate) {
      updates.startDate = null as any;
    }

    // 완료일 자동 설정
    if (progress === 100 && !oldTodo.completedDate) {
      updates.completedDate = today;
    }

    // 완료일 초기화 (진행률이 100 미만으로 낮아질 때)
    if (progress < 100 && oldTodo.completedDate) {
      updates.completedDate = null as any;
    }

    try {
      await updateTodo(todoId, updates);
      await reloadTasks();
    } catch (error) {
      console.error("할일 진행률 업데이트 실패:", error);
    }
  };

  // 작업 진행률 업데이트 (수동 또는 자동)
  const updateTaskProgress = async (
    taskId: string,
    manualProgress?: number
  ) => {
    // 최신 상태에서 작업 진행률을 계산
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newProgress: number;

    if (manualProgress !== undefined) {
      // 수동 진행률 설정 (할일이 없는 경우에만)
      newProgress = task.todos.length === 0 ? manualProgress : task.progress;
    } else {
      // 자동 진행률 계산 (할일의 평균)
      if (task.todos.length > 0) {
        const totalProgress = task.todos.reduce(
          (sum, todo) => sum + todo.progress,
          0
        );
        newProgress = Math.round(totalProgress / task.todos.length);
        console.log(`작업 ${task.title} 진행률 자동 계산:`, {
          todoCount: task.todos.length,
          todoProgresses: task.todos.map(t => t.progress),
          totalProgress,
          averageProgress: newProgress,
        });
      } else {
        newProgress = task.progress; // 할일이 없으면 기존 진행률 유지
        console.log(
          `작업 ${task.title} 할일 없음, 기존 진행률 유지:`,
          newProgress
        );
      }
    }

    // 상태 업데이트
    const newStatus: Task["status"] =
      newProgress === 100
        ? "completed"
        : newProgress > 0
          ? "in_progress"
          : "todo";

    // 변경사항이 있는 경우에만 업데이트
    if (newProgress !== task.progress || newStatus !== task.status) {
      try {
        // 완료일 설정
        const updates: Partial<Task> = {
          progress: newProgress,
          status: newStatus,
        };

        // 시작일 자동 설정 (0%에서 처음 시작할 때)
        if (task.progress === 0 && newProgress > 0 && !task.startDate) {
          updates.startDate = new Date().toISOString();
        }

        // 시작일 초기화 (진행률이 0으로 돌아갈 때)
        if (newProgress === 0 && task.startDate) {
          updates.startDate = undefined;
        }

        // 완료 상태로 변경될 때 완료일 기록
        if (newStatus === "completed" && !task.completedDate) {
          updates.completedDate = new Date().toISOString();
        }

        // 완료 상태에서 벗어날 때 완료일 초기화
        if (newStatus !== "completed" && task.completedDate) {
          updates.completedDate = undefined;
        }

        // Firebase에 작업 진행률 업데이트
        await updateTask(taskId, updates);

        // 로컬 상태 업데이트
        const updatedTasks = tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        );
        setTasks(updatedTasks);

        // 프로젝트 진행률 업데이트
        updateProjectProgress(updatedTasks);
      } catch (error) {
        console.error("작업 진행률 업데이트 실패:", error);
      }
    }
  };

  // 할일 편집 시작
  const startEditingTodo = (
    taskId: string,
    todoId: string,
    currentTitle: string
  ) => {
    // 이미 다른 할일을 편집 중이면 먼저 저장 (비동기로 백그라운드에서 실행)
    if (editingTodoId && editingTodoId !== todoId) {
      const previousTaskId = tasks.find(t =>
        t.todos.some(todo => todo.id === editingTodoId)
      )?.id;
      if (previousTaskId) {
        // 저장을 기다리지 않고 바로 실행 (깜빡임 방지)
        saveEditingTodo(previousTaskId, editingTodoId);
      }
    }

    // 즉시 새로운 편집 모드로 전환
    setEditingTodoId(todoId);
    setEditTodoName(currentTitle);
  };

  // 할일 편집 취소
  const cancelEditingTodo = () => {
    setEditingTodoId(null);
    setEditTodoName("");
  };

  // 할일 날짜 편집 시작
  const startEditingTodoDate = (todoId: string) => {
    setEditingTodoDate(todoId);
  };

  // 할일 날짜 편집 취소
  const cancelEditingTodoDate = () => {
    setEditingTodoDate(null);
  };

  // 할일 시작일 업데이트
  const updateTodoStartDate = async (
    taskId: string,
    todoId: string,
    newDate: Date | null
  ) => {
    const dateString = newDate
      ? new Date(
          newDate.getTime() - newDate.getTimezoneOffset() * 60000
        ).toISOString()
      : undefined;

    try {
      // Firebase에 할일 시작일 업데이트
      await updateTodo(todoId, {
        startDate: dateString,
        updatedAt: new Date().toISOString(),
      });

      // 작업 목록 새로고침
      await reloadTasks();
    } catch (error) {
      console.error("할일 시작일 업데이트 실패:", error);
    }

    setEditingTodoDate(null);
  };

  // 할일 완료일 업데이트
  const updateTodoCompletedDate = async (
    taskId: string,
    todoId: string,
    newDate: Date | null
  ) => {
    const dateString = newDate
      ? new Date(
          newDate.getTime() - newDate.getTimezoneOffset() * 60000
        ).toISOString()
      : undefined;

    try {
      // Firebase에 할일 완료일 업데이트
      await updateTodo(todoId, {
        completedDate: dateString,
        updatedAt: new Date().toISOString(),
      });

      // 작업 목록 새로고침
      await reloadTasks();
    } catch (error) {
      console.error("할일 완료일 업데이트 실패:", error);
    }

    setEditingTodoDate(null);
  };

  // 할일 편집 저장
  const saveEditingTodo = async (taskId: string, todoId: string) => {
    if (!editTodoName.trim()) return;

    try {
      // Firebase에 할일 제목 업데이트
      await updateTodo(todoId, {
        title: editTodoName.trim(),
        updatedAt: new Date().toISOString(),
      });

      // 작업 목록 새로고침
      await reloadTasks();
    } catch (error) {
      console.error("할일 편집 저장 실패:", error);
    }

    setEditingTodoId(null);
    setEditTodoName("");
  };

  // 작업 편집 시작
  const startEditingTask = (taskId: string, currentTitle: string) => {
    setEditingTaskId(taskId);
    setEditTaskName(currentTitle);
  };

  // 작업 편집 취소
  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditTaskName("");
  };

  // 작업 편집 저장
  const saveEditingTask = async (taskId: string) => {
    if (!editTaskName.trim()) return;

    try {
      // Firebase에 작업 제목 업데이트
      await updateTask(taskId, {
        title: editTaskName.trim(),
      });

      // 작업 목록 새로고침
      await reloadTasks();
    } catch (error) {
      console.error("작업 편집 저장 실패:", error);
    }

    setEditingTaskId(null);
    setEditTaskName("");
  };

  // 할일 삭제 처리
  const handleTodoDelete = async (taskId: string, todoId: string) => {
    try {
      // Firebase에서 할일 삭제
      await deleteTodo(todoId);

      // 작업 목록 새로고침
      await reloadTasks();
    } catch (error) {
      console.error("할일 삭제 실패:", error);
      setDialog({
        isOpen: true,
        title: "삭제 실패",
        message: "할일 삭제에 실패했습니다. 다시 시도해주세요.",
        type: "error",
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  // 작업 삭제 처리
  const handleTaskDelete = async (taskId: string, taskTitle: string) => {
    setDialog({
      isOpen: true,
      title: "작업 삭제",
      message: `"${taskTitle}" 작업을 삭제하시겠습니까?\n이 작업에 속한 모든 할일도 함께 삭제됩니다.`,
      type: "error",
      onConfirm: async () => {
        try {
          // Firebase에서 작업 삭제 (할일들도 자동 삭제됨)
          await deleteTask(taskId);

          // 작업 목록 새로고침
          await reloadTasks();

          setDialog({
            isOpen: true,
            title: "삭제 완료",
            message: "작업이 성공적으로 삭제되었습니다.",
            type: "success",
            onConfirm: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
            },
          });
        } catch (error) {
          console.error("작업 삭제 실패:", error);
          setDialog({
            isOpen: true,
            title: "삭제 실패",
            message: "작업 삭제에 실패했습니다. 다시 시도해주세요.",
            type: "error",
            onConfirm: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
            },
          });
        }
      },
    });
  };

  // 이슈 핸들러 함수들
  const handleAddIssue = async () => {
    if (!newIssue.title.trim() || !params.id) {
      console.log("이슈 추가 조건 미달:", {
        title: newIssue.title,
        projectId: params.id,
      });
      return;
    }

    console.log("이슈 생성 시도:", {
      projectId: params.id,
      title: newIssue.title,
      description: newIssue.description,
      status: newIssue.status,
      priority: newIssue.priority,
    });

    try {
      const issueId = await createIssue({
        projectId: params.id as string,
        title: newIssue.title,
        description: newIssue.description,
        status: newIssue.status,
        priority: newIssue.priority,
      });

      console.log("이슈 생성 결과:", issueId);

      if (!issueId) {
        console.error("이슈 생성 실패: ID가 반환되지 않았습니다.");
        alert("이슈 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      // 이슈 목록 새로고침
      const projectIssues = await fetchIssuesByProject(params.id as string);
      console.log("이슈 목록 새로고침:", projectIssues);
      setIssues(projectIssues);

      // 폼 초기화
      setNewIssue({
        title: "",
        description: "",
        priority: "medium",
        status: "open",
      });
      setIsAddingIssue(false);
    } catch (error) {
      console.error("이슈 생성 실패:", error);
      alert(`이슈 생성 중 오류가 발생했습니다: ${error}`);
    }
  };

  const handleUpdateIssue = async (
    issueId: string,
    updates: Partial<Issue>
  ) => {
    try {
      await updateIssue(issueId, updates);

      // 이슈 목록 새로고침
      if (params.id) {
        const projectIssues = await fetchIssuesByProject(params.id as string);
        setIssues(projectIssues);
      }

      setEditingIssueId(null);
    } catch (error) {
      console.error("이슈 업데이트 실패:", error);
    }
  };

  const handleDeleteIssue = async (issueId: string, issueTitle: string) => {
    setDialog({
      isOpen: true,
      title: "이슈 삭제",
      message: `"${issueTitle}" 이슈를 삭제하시겠습니까?`,
      type: "error",
      onConfirm: async () => {
        try {
          await deleteIssue(issueId);

          // 이슈 목록 새로고침
          if (params.id) {
            const projectIssues = await fetchIssuesByProject(
              params.id as string
            );
            setIssues(projectIssues);
          }

          setDialog({
            isOpen: true,
            title: "삭제 완료",
            message: "이슈가 성공적으로 삭제되었습니다.",
            type: "success",
            onConfirm: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
            },
          });
        } catch (error) {
          console.error("이슈 삭제 실패:", error);
          setDialog({
            isOpen: true,
            title: "삭제 실패",
            message: "이슈 삭제에 실패했습니다. 다시 시도해주세요.",
            type: "error",
            onConfirm: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
            },
          });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>프로젝트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  // 실시간 프로젝트 진행률 계산 (작업 진행률의 평균)
  const currentProjectProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length
        )
      : 0;

  return (
    <div className={styles.container}>
      {/* 콘텐츠 영역 */}
      <div className={styles.content}>
        <div className={styles.contentInner}>
          {/* 작업 목록 카드 */}
          <div className={styles.card}>
            {/* 프로젝트 진행률 및 정보 */}
            <div className={styles.progressSection}>
              <DonutChart
                progress={currentProjectProgress}
                size="sm"
                color={project.color}
              />
              <div className={styles.progressInfo}>
                <div className={styles.titleSection}>
                  <div
                    className={styles.projectColorBox}
                    style={{
                      backgroundColor: project.color,
                    }}
                  />
                  <h3 className={styles.progressTitle}>{project.name}</h3>
                </div>

                <div className={styles.projectStatusInfo}>
                  <div className={styles.statsChips}>
                    <span className={styles.statChip}>
                      작업 {completedTasks} / {totalTasks}
                    </span>
                    <span className={styles.statChip}>
                      할일 {completedTasks} / {totalTasks}
                    </span>
                  </div>
                  <div className={styles.headerDates}>
                    <p>{`${project.startDate} ~ ${project.endDate || '무기한'}`}</p>
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className={styles.headerActions}>
                <button
                  onClick={() => setShowIssuePanel(!showIssuePanel)}
                  className={`${styles.issueButton} ${
                    showIssuePanel ? styles.issueButtonActive : ""
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  이슈{" "}
                  <span className={styles.issueCount}>{issues.length}</span>
                </button>

                <button
                  onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                  className={`${styles.moreButton} ${
                    isHeaderExpanded ? styles.moreButtonActive : ""
                  }`}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 확장된 설명 영역 - progressSection 외부 */}
            <div
              className={`${styles.expandedHeaderContent} ${
                !isHeaderExpanded ? styles.collapsed : ""
              }`}
            >
              <div className={styles.projectDetailBox}>
                <p className={styles.descriptionArea}>
                  {project.description || "설명이 없습니다."}
                </p>
              </div>
              {isHeaderExpanded && (
                <div className={styles.descriptionActions}>
                  <button
                    onClick={() => {
                      setIsEditDrawerOpen(true);
                      setIsHeaderExpanded(false);
                    }}
                    className={styles.editDescriptionButton}
                  >
                    <Edit3 className="w-4 h-4" />
                    수정
                  </button>
                </div>
              )}
            </div>

            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <h2 className={styles.cardTitle}>작업 목록</h2>
                <span className={styles.cardTitleGuide}>작업 &gt; 할일</span>
              </div>

              <button
                onClick={handleAddNewTask}
                className={styles.addTaskButton}
                title="작업 추가"
                disabled={isAddingTask}
              >
                <Plus className="w-4 h-4" />

                <span>작업 추가</span>
              </button>
            </div>

            {/* 관리모드: 작업 목록 */}
            {viewMode === "manage" && (
              <>
                {/* 새 작업 추가 인풋 */}
                {isAddingTask && (
                  <div className={styles.addTaskInput}>
                    <input
                      type="text"
                      className={styles.taskInput}
                      placeholder="작업 이름을 입력하세요"
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter" && newTaskName.trim()) {
                          createNewTask();
                        } else if (e.key === "Escape") {
                          cancelAddNewTask();
                        }
                      }}
                    />
                    <div className={styles.taskInputActions}>
                      <button
                        onClick={createNewTask}
                        className={styles.saveTaskBtn}
                        disabled={!newTaskName.trim()}
                      >
                        추가
                      </button>
                      <button
                        onClick={cancelAddNewTask}
                        className={styles.cancelTaskBtn}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {tasks.length === 0 && !isAddingTask ? (
                  <button
                    onClick={handleAddNewTask}
                    className={styles.emptyTaskState}
                  >
                    <p className={styles.emptyStateTitle}>
                      작업을 추가하여 기록을 시작해보세요
                      <MessageCircleWarning className="w-4 h-4" />
                    </p>
                    <p className={styles.emptyStateText}>
                      <Plus className="w-4 h-4" />
                      새로운 작업 추가하기
                    </p>
                  </button>
                ) : (
                  (tasks.length > 0 || isAddingTask) && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleTaskDragStart}
                      onDragEnd={handleTaskDragEnd}
                    >
                      <SortableContext
                        items={tasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={styles.tasksSection}>
                          {tasks.map(task => (
                            <SortableTask
                              key={task.id}
                              task={task}
                              isExpanded={expandedTasks.has(task.id)}
                              editingTaskId={editingTaskId}
                              editTaskName={editTaskName}
                              isAddingTodo={isAddingTodo}
                              newTodoName={newTodoName}
                              editingTodoId={editingTodoId}
                              editTodoName={editTodoName}
                              editingTodoDate={editingTodoDate}
                              onToggleExpansion={toggleTaskExpansion}
                              onStartEditingTask={startEditingTask}
                              onSaveEditingTask={saveEditingTask}
                              onCancelEditingTask={cancelEditingTask}
                              onTaskDelete={handleTaskDelete}
                              onUpdateTaskProgress={updateTaskProgress}
                              onCreateTodo={createNewTodo}
                              onStartEditingTodo={startEditingTodo}
                              onSaveEditingTodo={saveEditingTodo}
                              onCancelEditingTodo={cancelEditingTodo}
                              onUpdateTodoProgress={updateTodoProgress}
                              onStartEditingTodoDate={startEditingTodoDate}
                              onCancelEditingTodoDate={cancelEditingTodoDate}
                              onUpdateTodoStartDate={updateTodoStartDate}
                              onTodoDelete={handleTodoDelete}
                              setIsAddingTodo={setIsAddingTodo}
                              setNewTodoName={setNewTodoName}
                              setEditTaskName={setEditTaskName}
                              setEditTodoName={setEditTodoName}
                              projectColor={project?.color || "#3b82f6"}
                              sortableTodos={
                                <div className={styles.todoList}>
                                  <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleTodoDragStart}
                                    onDragEnd={handleTodoDragEnd(task.id)}
                                  >
                                    <SortableContext
                                      items={task.todos.map(t => t.id)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      {task.todos.map(todo => (
                                        <SortableTodo
                                          key={todo.id}
                                          todo={todo}
                                          taskId={task.id}
                                          editingTodoId={editingTodoId}
                                          editTodoName={editTodoName}
                                          editingTodoDate={editingTodoDate}
                                          expandedTodoDate={expandedTodoDate}
                                          onStartEditingTodo={startEditingTodo}
                                          onSaveEditingTodo={saveEditingTodo}
                                          onCancelEditingTodo={
                                            cancelEditingTodo
                                          }
                                          onUpdateTodoProgress={
                                            updateTodoProgress
                                          }
                                          onStartEditingTodoDate={
                                            startEditingTodoDate
                                          }
                                          onCancelEditingTodoDate={
                                            cancelEditingTodoDate
                                          }
                                          onToggleDateExpansion={
                                            setExpandedTodoDate
                                          }
                                          onUpdateTodoStartDate={
                                            updateTodoStartDate
                                          }
                                          onUpdateTodoCompletedDate={
                                            updateTodoCompletedDate
                                          }
                                          onTodoDelete={handleTodoDelete}
                                          setEditTodoName={setEditTodoName}
                                        />
                                      ))}
                                    </SortableContext>
                                    <DragOverlay>
                                      {activeTodoId ? (
                                        <div className={styles.dragOverlayTodo}>
                                          <span
                                            className={styles.todoCardTitle}
                                          >
                                            {
                                              task.todos.find(
                                                t => t.id === activeTodoId
                                              )?.title
                                            }
                                          </span>
                                        </div>
                                      ) : null}
                                    </DragOverlay>
                                  </DndContext>

                                  {/* 할일 추가 버튼 또는 입력 카드 */}
                                  {isAddingTodo === task.id ? (
                                    <div className={styles.addTodoInputCard}>
                                      <input
                                        type="text"
                                        className={styles.todoInputInCard}
                                        placeholder="할일 이름을 입력하세요"
                                        value={newTodoName}
                                        onChange={e =>
                                          setNewTodoName(e.target.value)
                                        }
                                        autoFocus
                                        onKeyDown={e => {
                                          if (
                                            e.key === "Enter" &&
                                            newTodoName.trim()
                                          ) {
                                            createNewTodo(task.id);
                                          } else if (e.key === "Escape") {
                                            setIsAddingTodo(null);
                                            setNewTodoName("");
                                          }
                                        }}
                                      />
                                      <div
                                        className={styles.todoInputCardActions}
                                      >
                                        <button
                                          onClick={() => {
                                            setIsAddingTodo(null);
                                            setNewTodoName("");
                                          }}
                                          className={styles.cancelTodoBtn}
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={() => createNewTodo(task.id)}
                                          className={styles.saveTodoBtn}
                                          disabled={!newTodoName.trim()}
                                        >
                                          저장
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (!expandedTasks.has(task.id)) {
                                          toggleTaskExpansion(task.id);
                                        }
                                        setIsAddingTodo(task.id);
                                      }}
                                      className={styles.addTodoCard}
                                    >
                                      <Plus className={styles.addTodoIcon} />
                                      <span className={styles.addTodoText}>
                                        할일 추가
                                      </span>
                                    </button>
                                  )}
                                </div>
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeTaskId ? (
                          <div className={styles.dragOverlayTask}>
                            <div className={styles.taskHeader}>
                              <div className={styles.taskHeaderContent}>
                                <div className={styles.taskHeaderTop}>
                                  <div className={styles.taskTitleSection}>
                                    <h4 className={styles.taskTitle}>
                                      {
                                        tasks.find(t => t.id === activeTaskId)
                                          ?.title
                                      }
                                    </h4>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )
                )}
              </>
            )}

            {/* 요약모드: 작업 목록 */}
            {viewMode === "summary" && (
              <div className={styles.summaryMode}>
                {tasks.length === 0 ? (
                  <button
                    onClick={handleAddNewTask}
                    className={styles.emptyTaskState}
                  >
                    <p className={styles.emptyStateTitle}>
                      작업을 추가하여 기록을 시작해보세요
                      <MessageCircleWarning className="w-4 h-4" />
                    </p>
                    <p className={styles.emptyStateText}>
                      <Plus className="w-4 h-4" />
                      새로운 작업 추가하기
                    </p>
                  </button>
                ) : (
                  <div className={styles.summaryTasksList}>
                    {tasks.map(task => (
                      <div key={task.id} className={styles.summaryTaskItem}>
                        <div className={styles.summaryTaskHeader}>
                          <div className={styles.summaryTaskTitleRow}>
                            <div className={styles.summaryTaskProgressCircle}>
                              <DonutChart
                                progress={task.progress}
                                size="xs"
                                color={
                                  task.progress === 100
                                    ? "#3b82f6"
                                    : task.progress > 40
                                      ? "#34d399"
                                      : task.progress > 0
                                        ? "#fbbf24"
                                        : "#e5e7eb"
                                }
                                showLabel={false}
                              />
                            </div>
                            <span className={styles.summaryTaskTitle}>
                              {task.title}
                            </span>
                            <span className={styles.summaryTaskProgress}>
                              {task.progress}%
                            </span>
                          </div>
                        </div>

                        {/* 할일 목록 */}
                        {task.todos.length > 0 && (
                          <div className={styles.summaryTodosList}>
                            {task.todos.map(todo => (
                              <div
                                key={todo.id}
                                className={styles.summaryTodoItem}
                              >
                                <div className={styles.summaryTodoTitleRow}>
                                  <div className={styles.summaryTodoLeft}>
                                    <div
                                      className={`${styles.summaryTodoStatus} ${styles[todo.status]}`}
                                    />
                                    <span className={styles.summaryTodoIcon}>
                                      └
                                    </span>
                                    <span className={styles.summaryTodoTitle}>
                                      {todo.title}
                                    </span>
                                  </div>
                                  <span className={styles.summaryTodoProgress}>
                                    {todo.progress}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 커스텀 팝업 */}
          <ConfirmDialog
            isOpen={dialog.isOpen}
            title={dialog.title}
            message={dialog.message}
            type={dialog.type}
            confirmText={dialog.type === "warning" ? "네" : "확인"}
            cancelText={dialog.type === "warning" ? "아니오" : undefined}
            onConfirm={dialog.onConfirm}
            onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
          />

          {/* 이슈 패널 */}
          <div
            className={`${styles.issuePanel} ${showIssuePanel ? styles.issuePanelOpen : ""}`}
          >
            <div className={styles.issuePanelHeader}>
              <div className={styles.issuePanelTitle}>
                <AlertCircle className="w-5 h-5" />
                <h2>이슈사항</h2>
                <span className={styles.issueCount}>{issues.length}</span>
              </div>
              <button
                onClick={() => setShowIssuePanel(false)}
                className={styles.issuePanelCloseButton}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={styles.issuePanelContent}>
              {!isAddingIssue && (
                <button
                  onClick={() => setIsAddingIssue(true)}
                  className={styles.addIssueButton}
                >
                  <Plus className="w-4 h-4" />새 이슈 추가
                </button>
              )}

              {isAddingIssue && (
                <div className={styles.issueForm}>
                  <input
                    type="text"
                    placeholder="이슈 제목"
                    value={newIssue.title}
                    onChange={e =>
                      setNewIssue({ ...newIssue, title: e.target.value })
                    }
                    className={styles.issueFormInput}
                    autoFocus
                  />
                  <textarea
                    placeholder="이슈 설명"
                    value={newIssue.description}
                    onChange={e =>
                      setNewIssue({ ...newIssue, description: e.target.value })
                    }
                    className={styles.issueFormTextarea}
                    rows={4}
                  />
                  <div className={styles.issueFormRow}>
                    <select
                      value={newIssue.priority}
                      onChange={e =>
                        setNewIssue({
                          ...newIssue,
                          priority: e.target.value as Issue["priority"],
                        })
                      }
                      className={styles.issueFormSelect}
                    >
                      <option value="low">낮음</option>
                      <option value="medium">보통</option>
                      <option value="high">높음</option>
                      <option value="critical">긴급</option>
                    </select>
                  </div>
                  <div className={styles.issueFormActions}>
                    <button
                      onClick={() => {
                        setIsAddingIssue(false);
                        setNewIssue({
                          title: "",
                          description: "",
                          priority: "medium",
                          status: "open",
                        });
                      }}
                      className={styles.issueCancelButton}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddIssue}
                      className={styles.issueSaveButton}
                      disabled={!newIssue.title.trim()}
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.issuesList}>
                {issues.length === 0 && !isAddingIssue && (
                  <div className={styles.emptyIssues}>
                    <AlertCircle className="w-12 h-12 text-gray-300" />
                    <p>아직 이슈가 없습니다</p>
                  </div>
                )}

                {issues.map(issue => (
                  <div key={issue.id} className={styles.issueItem}>
                    <div className={styles.issueItemHeader}>
                      <div className={styles.issueItemTitle}>
                        <div
                          className={`${styles.issuePriority} ${styles[`issuePriority${issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}`]}`}
                        />
                        <span>{issue.title}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteIssue(issue.id, issue.title)}
                        className={styles.issueDeleteButton}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {issue.description && (
                      <p className={styles.issueDescription}>
                        {issue.description}
                      </p>
                    )}
                    <div className={styles.issueItemFooter}>
                      <select
                        value={issue.status}
                        onChange={e =>
                          handleUpdateIssue(issue.id, {
                            status: e.target.value as Issue["status"],
                          })
                        }
                        className={`${styles.issueStatusSelect} ${styles[`issueStatus${issue.status.charAt(0).toUpperCase() + issue.status.slice(1).replace("_", "")}`]}`}
                      >
                        <option value="open">열림</option>
                        <option value="in_progress">진행 중</option>
                        <option value="resolved">해결됨</option>
                        <option value="closed">닫힘</option>
                      </select>
                      <span className={styles.issueDate}>
                        {new Date(issue.createdAt).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 이슈 패널 오버레이 */}
          {showIssuePanel && (
            <div
              className={styles.issuePanelOverlay}
              onClick={() => setShowIssuePanel(false)}
            />
          )}
        </div>
      </div>
      {/* Floating 모드 토글 버튼 */}
      <div className={styles.floatingToggle}>
        <button
          onClick={() => setViewMode("manage")}
          className={`${styles.floatingButton} ${viewMode === "manage" ? styles.floatingButtonActive : ""}`}
        >
          <MousePointer2 className={styles.buttonIcon} />
          관리모드
        </button>
        <button
          onClick={() => setViewMode("summary")}
          className={`${styles.floatingButton} ${viewMode === "summary" ? styles.floatingButtonActive : ""}`}
        >
          <Notebook className={styles.buttonIcon} />
          요약모드
        </button>
      </div>

      {/* 프로젝트 수정 Drawer */}
      <EditProjectDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        project={project}
        onSuccess={handleEditSuccess}
        onDelete={handleDeleteSuccess}
      />
    </div>
  );
}
