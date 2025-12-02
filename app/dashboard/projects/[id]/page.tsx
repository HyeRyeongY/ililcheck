"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProgressBar from "@/components/ui/ProgressBar";
import ProgressDots from "@/components/ui/ProgressDots";
import { useAuth } from "@/contexts/AuthContext";
import {
  createTask,
  createTodo,
  deleteTodo,
  fetchProjects,
  fetchTasksByProject,
  updateProject,
  updateTask,
  updateTodo,
} from "@/lib/api";
import { Project, ProjectCategory, Task, Todo } from "@/lib/types";
import { ko } from "date-fns/locale/ko";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./page.module.css";
registerLocale("ko", ko);

const PRESET_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B739",
  "#52B788",
];

const CustomDateInput = React.forwardRef(
  ({ value, onClick }: any, ref: any) => {
    const [startDate, endDate] = value.split(" - ");
    return (
      <div className={styles.dateInputWrapper} onClick={onClick} ref={ref}>
        <span>{startDate || "시작일"}</span>
        <span className={styles.dateSeparator}>~</span>
        <span>{endDate || "종료일"}</span>
      </div>
    );
  }
);
CustomDateInput.displayName = "CustomDateInput";

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
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
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 편집 상태
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTodoName, setEditTodoName] = useState("");
  const [editingTodoDate, setEditingTodoDate] = useState<string | null>(null);

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

        const currentProject = allProjects.find(p => p.id === params.id);
        setProject(currentProject || null);

        // 폼 데이터 초기화
        if (currentProject) {
          const initialFormData = {
            name: currentProject.name || "",
            category: (currentProject.category ||
              "personal") as ProjectCategory,
            color: currentProject.color || "",
            startDate: currentProject.startDate || "",
            endDate: currentProject.endDate || "",
            description: currentProject.description || "",
          };
          setFormData(initialFormData);
        }

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
          setDialog(prev => ({ ...prev, isOpen: false }));
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

  const cancelEditing = () => {
    // 편집 모드 종료
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

  // 실제 저장 함수
  const performSave = async () => {
    if (!project || !params.id) return;

    setDialog(prev => ({ ...prev, isOpen: false }));
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
            setDialog(prev => ({ ...prev, isOpen: false }));
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
            setDialog(prev => ({ ...prev, isOpen: false }));
          },
        });
      }
    } catch (error) {
      console.error("프로젝트 저장 실패:", error);

      // 오류 팝업 표시
      setDialog({
        isOpen: true,
        title: "오류 발생",
        message:
          "프로젝트 저장 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.",
        type: "error",
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
        },
      });
    } finally {
      setSaving(false);
    }
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
  const addNewTodo = (taskId: string) => {
    setIsAddingTodo(taskId);
    setNewTodoName("");
    setNewTodoDueDate(null);
  };

  const createNewTodo = async (taskId: string) => {
    if (!newTodoName.trim()) return;

    try {
      // Firebase에 새 할일 생성
      const todoId = await createTodo({
        taskId,
        title: newTodoName.trim(),
        status: newTodoDueDate ? "todo" : "on_hold", // 날짜가 없으면 보류 상태
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: newTodoDueDate
          ? newTodoDueDate.toISOString().split("T")[0]
          : undefined,
      });

      if (todoId) {
        // 작업 목록 새로고침
        await reloadTasks();

        setIsAddingTodo(null);
        setNewTodoName("");
        setNewTodoDueDate(null);
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

    // 완료일 자동 설정
    if (progress === 100) {
      updates.completedDate = today;
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
    const newStatus: Task['status'] =
      newProgress === 100
        ? "completed"
        : newProgress > 0
          ? "in_progress"
          : "todo";

    // 변경사항이 있는 경우에만 업데이트
    if (newProgress !== task.progress || newStatus !== task.status) {
      try {
        // Firebase에 작업 진행률 업데이트
        await updateTask(taskId, {
          progress: newProgress,
          status: newStatus,
        });

        // 로컬 상태 업데이트
        const updatedTasks = tasks.map(t =>
          t.id === taskId
            ? { ...t, progress: newProgress, status: newStatus }
            : t
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
      {/* 헤더 */}
      <div
        className={`${styles.header} ${isHeaderExpanded || showSettings ? styles.headerExpanded : ""}`}
      >
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.titleSection}>
              <div
                className={styles.projectColorBox}
                style={{
                  backgroundColor: showSettings
                    ? formData.color
                    : project.color,
                }}
              />
              {showSettings ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    setTimeout(autoResizeTitleInput, 0);
                  }}
                  className={styles.titleInput}
                  autoFocus
                />
              ) : (
                <h1 className={styles.title}>{project.name}</h1>
              )}
            </div>
            <div className={styles.headerDates}>
              {showSettings ? (
                <DatePicker
                  selectsRange={true}
                  startDate={
                    formData.startDate ? new Date(formData.startDate) : null
                  }
                  endDate={formData.endDate ? new Date(formData.endDate) : null}
                  onChange={update => {
                    const [start, end] = update;
                    setFormData({
                      ...formData,
                      startDate: start
                        ? new Date(
                            start.getTime() - start.getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .split("T")[0]
                        : "",
                      endDate: end
                        ? new Date(
                            end.getTime() - end.getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .split("T")[0]
                        : "",
                    });
                  }}
                  customInput={
                    <CustomDateInput
                      value={
                        formData.startDate
                          ? `${formData.startDate} - ${formData.endDate || ""}`
                          : ""
                      }
                    />
                  }
                  dateFormat="yyyy-MM-dd"
                  popperPlacement="bottom-start"
                  locale="ko"
                />
              ) : (
                <p>{`${project.startDate} - ${project.endDate}`}</p>
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
                <button onClick={performSave} className={styles.completeButton}>
                  <Check className="w-4 h-4" />
                  완료
                </button>
              </>
            ) : (
              <>
                {isHeaderExpanded && (
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setIsHeaderExpanded(true);
                    }}
                    className={styles.editDescriptionButton}
                  >
                    <Edit3 className="w-4 h-4" />
                    수정
                  </button>
                )}
                <button
                  onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                  className={`${styles.moreButton} ${
                    isHeaderExpanded ? styles.moreButtonActive : ""
                  }`}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        {(isHeaderExpanded || showSettings) && (
          <div className={styles.expandedHeaderContent}>
            {showSettings ? (
              <div className={styles.projectDetailBox}>
                <label className={styles.label}>프로젝트 설명</label>
                <textarea
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={styles.descriptionTextarea}
                  rows={3}
                />
                <div className={styles.advancedSettings}>
                  <div className={styles.categorySettings}>
                    <label className={styles.label}>카테고리</label>
                    <div className={styles.categoryButtons}>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, category: "personal" })
                        }
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
                        onClick={() =>
                          setFormData({ ...formData, category: "work" })
                        }
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
                  <div className={styles.colorSettings}>
                    <label className={styles.label}>프로젝트 색상</label>
                    <div className={styles.colorPalette}>
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`${styles.colorButton} ${
                            formData.color === color
                              ? styles.colorButtonSelected
                              : ""
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`${styles.projectDetailBox} ${styles.descriptionContainer}`}
              >
                <p className={styles.descriptionArea}>
                  {project.description || "설명이 없습니다."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 작업 목록 */}
      <div className={styles.card}>
        {/* 프로젝트 진행률 */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <h3 className={styles.progressTitle}>프로젝트 진행률</h3>
            <span className={styles.progressText}>
              {completedTasks}/{totalTasks} 작업 완료 • {currentProjectProgress}
              %
            </span>
          </div>
          <div className={styles.progressBarWrapper}>
            <div className={styles.projectProgressContainer}>
              {tasks.length === 0 ? (
                <ProgressDots
                  progress={currentProjectProgress}
                  size="md"
                  onChange={progress => {
                    // 프로젝트 진행률 직접 수정 (작업이 없을 때만)
                    if (project && params.id) {
                      updateProject(params.id as string, { progress });
                      setProject({ ...project, progress });
                    }
                  }}
                />
              ) : (
                <ProgressBar
                  progress={currentProjectProgress}
                  showLabel={false}
                />
              )}
            </div>
          </div>
        </div>

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
                onClick={cancelAddNewTask}
                className={styles.cancelTaskBtn}
              >
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
              {tasks.map(task => (
                <div key={task.id} className={styles.taskItem}>
                  <div
                    className={`${styles.taskHeader} ${styles.taskHeaderClickable}`}
                    onClick={e => {
                      // 버튼 클릭이 아닌 경우에만 작업 확장/축소
                      const target = e.target as HTMLElement;
                      if (
                        !target.closest("button") &&
                        !target.closest("input")
                      ) {
                        toggleTaskExpansion(task.id);
                      }
                    }}
                  >
                    <div className={styles.taskInfo}>
                      <div className={styles.taskTitleSection}>
                        <div
                          className={`${styles.taskStatusIcon} ${
                            task.progress === 100
                              ? styles.completed
                              : task.progress > 0
                                ? styles.inProgress
                                : styles.pending
                          }`}
                        >
                          {task.progress === 100 ? (
                            <Check className="w-3 h-3" />
                          ) : task.progress > 0 ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <div className={styles.todoStatusDot} />
                          )}
                        </div>
                        <div className={styles.todoBadge}>
                          {
                            task.todos.filter(t => t.status === "completed")
                              .length
                          }
                          /{task.todos.length}
                        </div>

                        {editingTaskId === task.id ? (
                          <input
                            type="text"
                            value={editTaskName}
                            onChange={e => setEditTaskName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                saveEditingTask(task.id);
                              } else if (e.key === "Escape") {
                                cancelEditingTask();
                              }
                            }}
                            onBlur={() => saveEditingTask(task.id)}
                            className={styles.editTaskInput}
                            autoFocus
                          />
                        ) : (
                          <div
                            className={styles.taskTitleWrapper}
                            onClick={() =>
                              startEditingTask(task.id, task.title)
                            }
                          >
                            <h4 className={styles.taskTitle}>{task.title}</h4>
                            <Edit3 className={styles.editIcon} />
                          </div>
                        )}
                      </div>

                      <div className={styles.taskMeta}>
                        <div className={styles.taskStatsInfo}>
                          <div className={styles.taskProgressContainer}>
                            {task.todos.length === 0 ? (
                              <ProgressDots
                                progress={task.progress}
                                size="sm"
                                onChange={progress =>
                                  updateTaskProgress(task.id, progress)
                                }
                              />
                            ) : (
                              <ProgressBar progress={task.progress} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!expandedTasks.has(task.id)) {
                          toggleTaskExpansion(task.id);
                        } else {
                          addNewTodo(task.id);
                        }
                      }}
                      className={styles.addTodoBtn}
                      title={
                        expandedTasks.has(task.id) ? "할일 추가" : "작업 열기"
                      }
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
                          <div className={styles.todoInputRow}>
                            <input
                              type="text"
                              className={styles.todoInput}
                              placeholder="할일을 입력하세요"
                              value={newTodoName}
                              onChange={e => setNewTodoName(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === "Enter" && newTodoName.trim()) {
                                  createNewTodo(task.id);
                                } else if (e.key === "Escape") {
                                  setIsAddingTodo(null);

                                  setNewTodoName("");
                                  setNewTodoDueDate(null);
                                }
                              }}
                            />
                            <DatePicker
                              selected={newTodoDueDate}
                              onChange={date => setNewTodoDueDate(date)}
                              placeholderText="미정"
                              dateFormat="yyyy-MM-dd"
                              className={styles.todoDatePicker}
                              locale="ko"
                              isClearable
                            />
                          </div>

                          <div className={styles.todoInputActions}>
                            <button
                              onClick={() => {
                                setIsAddingTodo(null);

                                setNewTodoName("");
                                setNewTodoDueDate(null);
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

                      {task.todos.map(todo => (
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
                                        saveEditingTodo(task.id, todo.id);
                                      } else if (e.key === "Escape") {
                                        cancelEditingTodo();
                                      }
                                    }}
                                    onBlur={() =>
                                      saveEditingTodo(task.id, todo.id)
                                    }
                                    className={styles.editTodoInput}
                                    autoFocus
                                  />
                                ) : (
                                  <div
                                    className={styles.todoTitleWrapper}
                                    onClick={() =>
                                      startEditingTodo(
                                        task.id,
                                        todo.id,
                                        todo.title
                                      )
                                    }
                                  >
                                    <span
                                      className={`${styles.todoTitle} ${
                                        todo.status === "completed"
                                          ? styles.completed
                                          : ""
                                      }`}
                                    >
                                      {todo.title}
                                    </span>
                                    <Edit3 className={styles.editIcon} />
                                  </div>
                                )}

                                {/* 시작일/완료일 표시 및 선택 */}
                                <div className={styles.todoDateSection}>
                                  <div className={styles.todoDateInfo}>
                                    {editingTodoDate === todo.id ? (
                                      <DatePicker
                                        selected={
                                          todo.startDate
                                            ? new Date(todo.startDate)
                                            : null
                                        }
                                        onChange={date =>
                                          updateTodoStartDate(
                                            task.id,
                                            todo.id,
                                            date
                                          )
                                        }
                                        onClickOutside={() =>
                                          cancelEditingTodoDate()
                                        }
                                        placeholderText="시작일 선택"
                                        dateFormat="yyyy-MM-dd"
                                        className={styles.todoDatePickerInline}
                                        locale="ko"
                                        isClearable
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        className={`${styles.todoDateLabel} ${styles.clickable}`}
                                        onClick={() =>
                                          startEditingTodoDate(todo.id)
                                        }
                                        title="클릭하여 시작일 설정"
                                      >
                                        시작:{" "}
                                        {todo.startDate
                                          ? new Date(
                                              todo.startDate
                                            ).toLocaleDateString("ko-KR", {
                                              month: "short",
                                              day: "numeric",
                                            })
                                          : "-"}
                                      </span>
                                    )}
                                    <span className={styles.todoDateLabel}>
                                      완료:{" "}
                                      {todo.completedDate
                                        ? new Date(
                                            todo.completedDate
                                          ).toLocaleDateString("ko-KR", {
                                            month: "short",
                                            day: "numeric",
                                          })
                                        : "-"}
                                    </span>
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
                                onChange={progress =>
                                  updateTodoProgress(task.id, todo.id, progress)
                                }
                              />
                            </div>

                            {/* 할일 삭제 버튼 */}

                            <div className={styles.todoActions}>
                              <button
                                onClick={() =>
                                  handleTodoDelete(task.id, todo.id)
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
    </div>
  );
}
