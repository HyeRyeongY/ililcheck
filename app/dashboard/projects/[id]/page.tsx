"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  X,
  Calendar as CalendarIcon,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  ArrowRight,
  Pause,
  Trash2,
  Edit3,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchProjects,
  updateProject,
  fetchTasksByProject,
  createTask,
  updateTask,
  createTodo,
  updateTodo,
  deleteTodo,
} from "@/lib/api";
import { Project, ProjectCategory, Task, Todo } from "@/lib/types";
import ProgressBar from "@/components/ui/ProgressBar";
import ProgressDots from "@/components/ui/ProgressDots";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import styles from "./page.module.css";

// 색상 팔레트
const colorPalette = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ef4444", // red
  "#f97316", // orange
  "#14b8a6", // teal
  "#ec4899", // pink
  "#84cc16", // lime
];

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 작업 편집 상태
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");

  // 할일 상태
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isAddingTodo, setIsAddingTodo] = useState<string | null>(null);
  const [newTodoName, setNewTodoName] = useState("");

  // 인라인 편집 상태
  const [editingField, setEditingField] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    category: "personal" as ProjectCategory,
    color: "",
    startDate: "",
    endDate: "",
    description: "",
  });

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

        const currentProject = allProjects.find((p) => p.id === params.id);
        setProject(currentProject || null);

        // 폼 데이터 초기화
        if (currentProject) {
          const initialFormData = {
            name: currentProject.name || "",
            category: (currentProject.category || "personal") as ProjectCategory,
            color: currentProject.color || "",
            startDate: currentProject.startDate || "",
            endDate: currentProject.endDate || "",
            description: currentProject.description || "",
          };
          setFormData(initialFormData);
        }

        // 프로젝트에 대한 작업 목록 불러오기 (로컬 스토리지에서)
        try {
          const savedTasks = localStorage.getItem(`project_tasks_${params.id}`);
          if (savedTasks) {
            setTasks(JSON.parse(savedTasks));
          } else {
            setTasks([]);
          }
        } catch (error) {
          console.error("작업 목록 로드 실패:", error);
          setTasks([]);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, params.id]);

  // 저장 확인 함수
  const handleSave = () => {
    if (!project || !params.id) return;

    // 변경된 내용이 있는지 확인
    const hasChanges =
      formData.name !== project.name ||
      formData.category !== (project.category || "personal") ||
      formData.color !== project.color ||
      formData.startDate !== project.startDate ||
      formData.endDate !== project.endDate ||
      formData.description !== (project.description || "");

    if (!hasChanges) {
      setDialog({
        isOpen: true,
        title: "변경사항 없음",
        message: "변경된 내용이 없습니다.",
        type: "info",
        onConfirm: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
          setShowSettings(false);
        },
      });
      return;
    }

    // 저장 확인 팝업 표시
    setDialog({
      isOpen: true,
      title: "설정 저장",
      message: "프로젝트 설정을 저장하시겠습니까?",
      type: "warning",
      onConfirm: performSave,
    });
  };

  // 제목 인풋 자동 리사이징 함수
  const autoResizeTitleInput = () => {
    const input = titleInputRef.current;
    if (input) {
      // 임시 측정용 엘리먼트 생성
      const tempSpan = document.createElement("span");
      tempSpan.style.font = window.getComputedStyle(input).font;
      tempSpan.style.fontSize = "1.25rem";
      tempSpan.style.fontWeight = "600";
      tempSpan.style.visibility = "hidden";
      tempSpan.style.position = "absolute";
      tempSpan.style.whiteSpace = "nowrap";
      tempSpan.textContent = input.value || input.placeholder;

      document.body.appendChild(tempSpan);
      const textWidth = tempSpan.offsetWidth + 32; // padding과 여유공간 추가
      document.body.removeChild(tempSpan);

      // 최소 너비 200px, 최대 너비는 부모 컨테이너의 80%
      const minWidth = 200;
      const maxWidth = Math.min(textWidth, window.innerWidth * 0.6);
      input.style.width = `${Math.max(minWidth, maxWidth)}px`;
    }
  };

  // 인라인 편집 관련 함수들
  const startEditing = (fieldName: string) => {
    setEditingField(fieldName);
    // 제목 편집 시작할 때 초기 크기 설정
    if (fieldName === "title") {
      setTimeout(autoResizeTitleInput, 0);
    }
  };

  const cancelEditing = () => {
    // 편집 모드 종료
    setEditingField(null);
    setShowSettings(false);

    // 폼 데이터를 원본으로 완전히 되돌림
    if (project) {
      setFormData({
        name: project.name || "",
        category: (project.category || "personal") as ProjectCategory,
        color: project.color || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        description: project.description || "",
      });
    }

    console.log("편집 취소됨 - 모든 변경사항이 되돌려졌습니다.");
  };

  const saveField = async (fieldName: string) => {
    if (!project || !params.id) return;

    try {
      // 필드 이름에서 '_advanced' 접미사 제거 및 title -> name 변환
      let actualFieldName = fieldName.replace("_advanced", "");
      if (actualFieldName === "title") {
        actualFieldName = "name";
      }

      const fieldUpdates = {
        [actualFieldName]: formData[actualFieldName as keyof typeof formData],
      };
      const success = await updateProject(params.id as string, fieldUpdates);

      if (success) {
        // 프로젝트 상태 즉시 업데이트
        const updatedProject = { ...project, ...fieldUpdates };
        setProject(updatedProject);

        // 사이드바에 프로젝트 업데이트 알림
        window.dispatchEvent(
          new CustomEvent("projectUpdated", {
            detail: { projectId: params.id, updates: fieldUpdates },
          })
        );

        setEditingField(null);
      }
    } catch (error) {
      console.error("필드 저장 실패:", error);
    }
  };

  // 실제 저장 함수
  const performSave = async () => {
    if (!project || !params.id) return;

    setDialog((prev) => ({ ...prev, isOpen: false }));
    setSaving(true);

    try {
      const success = await updateProject(params.id as string, formData);

      if (success) {
        // 프로젝트 상태 즉시 업데이트
        const updatedProject = { ...project, ...formData };
        setProject(updatedProject);

        // 사이드바에 프로젝트 업데이트 알림
        window.dispatchEvent(
          new CustomEvent("projectUpdated", {
            detail: { projectId: params.id, updates: formData },
          })
        );

        setShowSettings(false);

        // 성공 팝업 표시
        setDialog({
          isOpen: true,
          title: "저장 완료",
          message: "프로젝트 설정이 성공적으로 저장되었습니다.",
          type: "success",
          onConfirm: () => {
            setDialog((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        // 실패 팝업 표시
        setDialog({
          isOpen: true,
          title: "저장 실패",
          message: "프로젝트 업데이트에 실패했습니다. 다시 시도해주세요.",
          type: "error",
          onConfirm: () => {
            setDialog((prev) => ({ ...prev, isOpen: false }));
          },
        });
      }
    } catch (error) {
      console.error("프로젝트 저장 실패:", error);

      // 오류 팝업 표시
      setDialog({
        isOpen: true,
        title: "오류 발생",
        message: "프로젝트 저장 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.",
        type: "error",
        onConfirm: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } finally {
      setSaving(false);
    }
  };

  // 로컬 스토리지에 작업 저장
  const saveTasksToLocal = (updatedTasks: Task[]) => {
    if (!params.id) return;
    try {
      localStorage.setItem(`project_tasks_${params.id}`, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("로컬 스토리지 저장 실패:", error);
    }
  };

  // 프로젝트 진행률 업데이트 (작업 진행률의 평균)
  const updateProjectProgress = async (updatedTasks: Task[]) => {
    if (!project || !params.id || updatedTasks.length === 0) return;

    // 작업 진행률의 평균 계산
    const totalProgress = updatedTasks.reduce((sum, task) => sum + task.progress, 0);
    const averageProgress = Math.round(totalProgress / updatedTasks.length);

    // 프로젝트 상태 업데이트
    const updatedProject = {
      ...project,
      progress: averageProgress,
    };
    setProject(updatedProject);

    // TODO: API 호출하여 프로젝트 진행률 저장
    try {
      await updateProject(params.id as string, { progress: averageProgress });

      // 사이드바에 프로젝트 업데이트 알림
      window.dispatchEvent(
        new CustomEvent("projectUpdated", {
          detail: { projectId: params.id, updates: { progress: averageProgress } },
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

    // 새 작업 객체 생성
    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: params.id as string,
      title: newTaskName.trim(),
      status: "todo",
      progress: 0,
      createdAt: new Date().toISOString(),
      todos: [],
    };

    // 로컬 상태 및 스토리지 업데이트
    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks, newTask];
      saveTasksToLocal(updatedTasks);
      updateProjectProgress(updatedTasks);
      return updatedTasks;
    });

    setIsAddingTask(false);
    setNewTaskName("");

    setDialog({
      isOpen: true,
      title: "생성 완료",
      message: `"${newTask.title}" 작업이 생성되었습니다.`,
      type: "success",
      onConfirm: () => {
        setDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // 작업 확장/축소 토글
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
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
  const addNewTodo = (taskId: string) => {
    setIsAddingTodo(taskId);
    setNewTodoName("");
  };

  const createNewTodo = async (taskId: string) => {
    if (!newTodoName.trim()) return;

    // 새 할일 객체 생성
    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      taskId,
      title: newTodoName.trim(),
      status: "todo",
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 로컬 상태 및 스토리지 업데이트
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId ? { ...task, todos: [...task.todos, newTodo] } : task
      );
      saveTasksToLocal(updatedTasks);
      // 할일 추가 후 프로젝트 진행률 업데이트 (약간의 지연을 두고)
      setTimeout(() => updateProjectProgress(updatedTasks), 100);
      return updatedTasks;
    });

    setIsAddingTodo(null);
    setNewTodoName("");
  };

  // 할일 진행률 업데이트
  const updateTodoProgress = async (taskId: string, todoId: string, progress: number) => {
    const updatedStatus = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "todo";
    console.log(`할일 진행률 업데이트: ${todoId} -> ${progress}%`);

    // 로컬 상태 및 스토리지 업데이트
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              todos: task.todos.map((todo) =>
                todo.id === todoId
                  ? {
                      ...todo,
                      progress,
                      status: updatedStatus,
                      updatedAt: new Date().toISOString(),
                    }
                  : todo
              ),
            }
          : task
      );
      saveTasksToLocal(updatedTasks);
      return updatedTasks;
    });

    // 작업 진행률 자동 계산 (할일이 있는 경우)
    updateTaskProgress(taskId);
  };

  // 작업 진행률 업데이트 (수동 또는 자동)
  const updateTaskProgress = async (taskId: string, manualProgress?: number) => {
    // 최신 상태에서 작업 진행률을 계산하기 위해 setTasks 내부에서 처리
    setTasks((prevTasks) => {
      const task = prevTasks.find((t) => t.id === taskId);
      if (!task) return prevTasks;

      let newProgress: number;

      if (manualProgress !== undefined) {
        // 수동 진행률 설정 (할일이 없는 경우에만)
        newProgress = task.todos.length === 0 ? manualProgress : task.progress;
      } else {
        // 자동 진행률 계산 (할일의 평균)
        if (task.todos.length > 0) {
          const totalProgress = task.todos.reduce((sum, todo) => sum + todo.progress, 0);
          newProgress = Math.round(totalProgress / task.todos.length);
          console.log(`작업 ${task.title} 진행률 자동 계산:`, {
            todoCount: task.todos.length,
            todoProgresses: task.todos.map((t) => t.progress),
            totalProgress,
            averageProgress: newProgress,
          });
        } else {
          newProgress = task.progress; // 할일이 없으면 기존 진행률 유지
          console.log(`작업 ${task.title} 할일 없음, 기존 진행률 유지:`, newProgress);
        }
      }

      // 상태 업데이트
      const newStatus =
        newProgress === 100 ? "completed" : newProgress > 0 ? "in_progress" : "todo";

      // 변경사항이 있는 경우에만 업데이트
      if (newProgress !== task.progress || newStatus !== task.status) {
        const updatedTasks = prevTasks.map((t) =>
          t.id === taskId ? { ...t, progress: newProgress, status: newStatus } : t
        );

        // 로컬 스토리지에 저장
        saveTasksToLocal(updatedTasks);

        // 프로젝트 진행률 업데이트
        updateProjectProgress(updatedTasks);

        return updatedTasks;
      }

      return prevTasks;
    });
  };

  // 할일 액션 처리
  const handleTodoAction = async (taskId: string, todoId: string, action: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let updateData: Partial<Todo> | null = null;
    let shouldDelete = false;

    switch (action) {
      case "postpone":
        updateData = {
          status: "postponed" as const,
          updatedAt: new Date().toISOString(),
        };
        break;
      case "tomorrow":
        updateData = {
          dueDate: tomorrow.toISOString().split("T")[0],
          updatedAt: new Date().toISOString(),
        };
        break;
      case "hold":
        updateData = {
          status: "on_hold" as const,
          updatedAt: new Date().toISOString(),
        };
        break;
      case "delete":
        shouldDelete = true;
        break;
    }

    // 로컬 상태 및 스토리지 업데이트
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              todos: shouldDelete
                ? task.todos.filter((todo) => todo.id !== todoId)
                : task.todos.map((todo) =>
                    todo.id === todoId ? { ...todo, ...updateData } : todo
                  ),
            }
          : task
      );
      saveTasksToLocal(updatedTasks);
      return updatedTasks;
    });

    // 할일 변경 후 작업 진행률 재계산
    setTimeout(() => updateTaskProgress(taskId), 100);
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
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  // 실시간 프로젝트 진행률 계산 (작업 진행률의 평균)
  const currentProjectProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
      : 0;

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div
              className={styles.projectColorBox}
              style={{ backgroundColor: formData.color || project.color }}
            />
            <div className={styles.titleSection}>
              {editingField === "title" ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    // 입력할 때마다 자동 리사이징
                    setTimeout(autoResizeTitleInput, 0);
                  }}
                  className={styles.titleInput}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault(); // 개별 저장 방지
                    if (e.key === "Escape") cancelEditing();
                  }}
                />
              ) : (
                <>
                  <h1 className={styles.title}>{formData.name || project.name}</h1>
                  {showSettings && (
                    <button
                      onClick={() => startEditing("title")}
                      className={styles.editTitleButton}
                      title="프로젝트 이름 편집"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {showSettings ? (
              <>
                <button onClick={cancelEditing} className={styles.cancelButton}>
                  <X className="w-4 h-4" />
                  취소
                </button>
                <button
                  onClick={async () => {
                    // 모든 변경사항을 저장
                    try {
                      const success = await updateProject(params.id as string, formData);
                      if (success) {
                        // 완료 버튼 클릭 시에만 프로젝트 상태 업데이트
                        const updatedProject = { ...project, ...formData };
                        setProject(updatedProject);

                        // 사이드바에 프로젝트 업데이트 알림
                        window.dispatchEvent(
                          new CustomEvent("projectUpdated", {
                            detail: { projectId: params.id, updates: formData },
                          })
                        );
                      }
                    } catch (error) {
                      console.error("프로젝트 저장 실패:", error);
                    }

                    setShowSettings(false);
                    setEditingField(null);
                  }}
                  className={styles.completeButton}
                >
                  <Check className="w-4 h-4" />
                  완료
                </button>
              </>
            ) : (
              <button onClick={() => setShowSettings(true)} className={styles.settingsButton}>
                <Edit3 className="w-4 h-4" />
                편집
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 프로젝트 개요 (헤더 바로 아래) */}
      <div
        className={styles.projectOverview}
        onClick={(e) => {
          // 편집 중인 필드가 있고, 클릭한 곳이 편집 필드나 편집 관련 버튼이 아니면 포커스 해제
          const target = e.target as HTMLElement;
          if (editingField && !target.closest("input, textarea, .editTitleButton, .editable")) {
            setEditingField(null);
          }
        }}
      >
        <div className={styles.overviewContent}>
          {/* 기본 정보 영역 */}
          <div className={styles.basicInfoSection}>
            {/* 날짜 정보 */}
            <div className={styles.overviewDates}>
              {/* 시작일 */}
              <div className={styles.dateItem}>
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className={styles.dateLabel}>시작일:</span>
                {editingField === "startDate" ? (
                  <div className={styles.inlineEditField}>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className={styles.dateInput}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                  </div>
                ) : (
                  <span
                    className={`${styles.dateValue} ${showSettings ? styles.editable : ""}`}
                    onClick={() => showSettings && startEditing("startDate")}
                  >
                    {formData.startDate || (showSettings ? "시작일 설정" : "미정")}
                  </span>
                )}
              </div>

              {/* 종료일 */}
              <div className={styles.dateItem}>
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className={styles.dateLabel}>종료일:</span>
                {editingField === "endDate" ? (
                  <div className={styles.inlineEditField}>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className={styles.dateInput}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                  </div>
                ) : (
                  <span
                    className={`${styles.dateValue} ${showSettings ? styles.editable : ""}`}
                    onClick={() => showSettings && startEditing("endDate")}
                  >
                    {formData.endDate || (showSettings ? "종료일 설정" : "미정")}
                  </span>
                )}
              </div>
            </div>

            {/* 프로젝트 설명 */}
            {(formData.description || showSettings || editingField === "description") && (
              <div className={styles.overviewDescription}>
                {editingField === "description" ? (
                  <div className={styles.inlineEditField}>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={styles.descriptionTextarea}
                      placeholder="프로젝트 설명을 입력하세요..."
                      autoFocus
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) e.preventDefault();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                    <div className={styles.editHint}>
                      <span>Esc로 취소</span>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`${styles.descriptionText} ${showSettings ? styles.editable : ""}`}
                    onClick={() => showSettings && startEditing("description")}
                  >
                    {formData.description || (showSettings ? "설명 추가하기" : "")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 편집 모드에서만 보이는 추가 설정들 */}
          {showSettings && (
            <div className={styles.additionalSettings}>
              <div className={styles.settingsRow}>
                {/* 프로젝트 카테고리 */}
                <div className={styles.settingField}>
                  <label className={styles.label}>카테고리</label>
                  <div className={styles.categoryButtons}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: "personal" });
                      }}
                      className={`${styles.categoryButton} ${
                        formData.category === "personal"
                          ? styles.categoryButtonSelected
                          : styles.categoryButtonDefault
                      }`}
                    >
                      개인
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: "work" });
                      }}
                      className={`${styles.categoryButton} ${
                        formData.category === "work"
                          ? styles.categoryButtonSelected
                          : styles.categoryButtonDefault
                      }`}
                    >
                      업무
                    </button>
                  </div>
                </div>

                {/* 프로젝트 색상 */}
                <div className={styles.settingField}>
                  <label className={styles.label}>프로젝트 색상</label>
                  <div className={styles.colorPalette}>
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, color });
                        }}
                        className={`${styles.colorButton} ${
                          formData.color === color ? styles.colorButtonSelected : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 진행률 */}
          <div className={styles.overviewProgress}>
            <div className={styles.progressInfo}>
              <span className={styles.progressLabel}>전체 진행률</span>
              <span className={styles.progressValue}>{currentProjectProgress}%</span>
            </div>
            <ProgressBar
              progress={currentProjectProgress}
              color={project.color}
              showLabel={false}
            />
            <p className={styles.progressSubtext}>
              {completedTasks}/{totalTasks} 작업 완료 · 작업 진행률 평균: {currentProjectProgress}%
            </p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.contentInner}>
          {/* 작업 목록 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>작업 목록</h2>
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

            {/* 새 작업 추가 인풋 */}
            {isAddingTask && (
              <div className={styles.addTaskInput}>
                <input
                  type="text"
                  className={styles.taskInput}
                  placeholder="작업 이름을 입력하세요"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTaskName.trim()) {
                      createNewTask();
                    } else if (e.key === "Escape") {
                      cancelAddNewTask();
                    }
                  }}
                />
                <div className={styles.taskInputActions}>
                  <button onClick={cancelAddNewTask} className={styles.cancelTaskBtn}>
                    취소
                  </button>
                  <button
                    onClick={createNewTask}
                    className={styles.saveTaskBtn}
                    disabled={!newTaskName.trim()}
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {tasks.length === 0 && !isAddingTask ? (
              <div className={styles.emptyTaskState}>
                <p className={styles.emptyStateTitle}>등록된 작업이 없습니다</p>
                <p className={styles.emptyStateText}>새로운 작업을 추가해보세요</p>
              </div>
            ) : (
              (tasks.length > 0 || isAddingTask) && (
                <div className={styles.tasksSection}>
                  {tasks.map((task) => (
                    <div key={task.id} className={styles.taskItem}>
                      <div className={styles.taskHeader}>
                        <div className={styles.taskInfo}>
                          <h4 className={styles.taskTitle}>{task.title}</h4>
                          <div className={styles.taskMeta}>
                            <ProgressDots
                              progress={task.progress}
                              size="sm"
                              disabled={task.todos.length > 0} // 할일이 있으면 수동 진행률 비활성화
                              onChange={
                                task.todos.length === 0
                                  ? (progress) => updateTaskProgress(task.id, progress)
                                  : undefined
                              }
                            />
                            <span className={styles.todoCount}>
                              {task.todos.length > 0
                                ? `${task.todos.length}개 할일 (평균 진행률)`
                                : "할일 없음 (수동 진행률)"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => addNewTodo(task.id)}
                          className={styles.addTodoBtn}
                          title="할일 추가"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className={styles.taskToggle}
                        >
                          {expandedTasks.has(task.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* 확장된 할일 목록 */}
                      {expandedTasks.has(task.id) && (
                        <div className={styles.todoList}>
                          {/* 새 할일 추가 입력 */}
                          {isAddingTodo === task.id && (
                            <div className={styles.addTodoInput}>
                              <input
                                type="text"
                                className={styles.todoInput}
                                placeholder="할일을 입력하세요"
                                value={newTodoName}
                                onChange={(e) => setNewTodoName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newTodoName.trim()) {
                                    createNewTodo(task.id);
                                  } else if (e.key === "Escape") {
                                    setIsAddingTodo(null);
                                    setNewTodoName("");
                                  }
                                }}
                              />
                              <div className={styles.todoInputActions}>
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
                                  추가
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 할일 목록 */}
                          {task.todos.map((todo) => (
                            <div key={todo.id} className={styles.todoItem}>
                              <div className={styles.todoContent}>
                                <div className={styles.todoInfo}>
                                  <div className={`${styles.todoStatus} ${styles[todo.status]}`} />
                                  <span
                                    className={`${styles.todoTitle} ${
                                      todo.status === "completed" ? styles.completed : ""
                                    }`}
                                  >
                                    {todo.title}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.todoControls}>
                                <div className={styles.todoProgress}>
                                  <ProgressDots
                                    progress={todo.progress}
                                    size="sm"
                                    onChange={(progress) =>
                                      updateTodoProgress(task.id, todo.id, progress)
                                    }
                                  />
                                </div>
                                {/* 할일 액션 버튼들 */}
                                <div className={styles.todoActions}>
                                  <button
                                    onClick={() => handleTodoAction(task.id, todo.id, "postpone")}
                                    className={styles.todoActionBtn}
                                    title="미루기"
                                  >
                                    <Clock className="w-3 h-3" />
                                    미루기
                                  </button>
                                  <button
                                    onClick={() => handleTodoAction(task.id, todo.id, "tomorrow")}
                                    className={styles.todoActionBtn}
                                    title="내일로"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                    내일로
                                  </button>
                                  <button
                                    onClick={() => handleTodoAction(task.id, todo.id, "hold")}
                                    className={styles.todoActionBtn}
                                    title="보류"
                                  >
                                    <Pause className="w-3 h-3" />
                                    보류
                                  </button>
                                  <button
                                    onClick={() => handleTodoAction(task.id, todo.id, "delete")}
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

                          {task.todos.length === 0 && isAddingTodo !== task.id && (
                            <div className={styles.emptyTodos}>
                              <p>할일이 없습니다. 새로운 할일을 추가해보세요.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 커스텀 팝업 */}
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        confirmText={dialog.type === "warning" ? "네" : "확인"}
        cancelText={dialog.type === "warning" ? "아니오" : "확인"}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
