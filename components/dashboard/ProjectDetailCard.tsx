'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Check } from 'lucide-react';
import { Project, TaskGroup, Task } from '@/lib/types';
import { createTask } from '@/lib/api';
import TaskItem from './TaskItem';
import styles from './ProjectDetailCard.module.css';

interface ProjectDetailCardProps {
  project: Project;
  taskGroups: TaskGroup[];
  onTaskStatusChange: (taskId: string, status: Task['status']) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskProgressChange?: (taskId: string, progress: number) => void;
  onTaskAdded?: () => void;
}

export default function ProjectDetailCard({
  project,
  taskGroups,
  onTaskStatusChange,
  onTaskDelete,
  onTaskProgressChange,
  onTaskAdded,
}: ProjectDetailCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [addingTaskGroup, setAddingTaskGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleAddClick = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingTaskGroup(groupId);
    setExpandedGroups((prev) => ({ ...prev, [groupId]: true }));
  };

  const handleCancelAdd = () => {
    setAddingTaskGroup(null);
    setNewTaskTitle('');
  };

  const handleSubmitTask = async (groupId: string) => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle,
        status: 'todo',
        progress: 0,
        projectId: project.id,
        createdAt: new Date().toISOString(),
        todos: [],
      });

      setNewTaskTitle('');
      setAddingTaskGroup(null);

      // 부모 컴포넌트에 작업 추가 알림
      if (onTaskAdded) {
        onTaskAdded();
      }
    } catch (error) {
      console.error('작업 추가 실패:', error);
    }
  };

  return (
    <div className={styles.container}>
      {/* 프로젝트 헤더 */}
      <div className={styles.projectHeader} style={{ borderLeftColor: project.color }}>
        <h3 className={styles.projectTitle}>{project.name}</h3>
      </div>

      {/* 작업 그룹 */}
      <div className={styles.taskGroupsContainer}>
        {taskGroups.map((group) => {
          const isExpanded = expandedGroups[group.id];
          const completedCount = group.tasks.filter((t) => t.status === 'completed').length;

          return (
            <div key={group.id} className={styles.taskGroup}>
              {/* 그룹 헤더 */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={styles.groupHeader}
              >
                <div className={styles.groupHeaderLeft}>
                  {isExpanded ? (
                    <ChevronDown className={styles.chevronIcon} />
                  ) : (
                    <ChevronRight className={styles.chevronIcon} />
                  )}
                  <span className={styles.groupName}>{group.name}</span>
                </div>
                <div className={styles.groupHeaderRight}>
                  <span className={styles.taskCount}>
                    {completedCount}/{group.tasks.length}개
                  </span>
                  <button
                    onClick={(e) => handleAddClick(group.id, e)}
                    className={styles.addButton}
                    title="작업 추가"
                  >
                    <Plus className={styles.addIcon} />
                  </button>
                </div>
              </button>

              {/* 작업 진행률 */}
              <div className={styles.groupProgress}>
                <div className={styles.progressRow}>
                  <span className={styles.progressLabel}>작업 진행률</span>
                  <div className={styles.progressBarWrapper}>
                    <div
                      className={styles.progressBar}
                      style={{
                        backgroundColor: project.color,
                        width: `${group.progress}%`,
                      }}
                    />
                  </div>
                  <span className={styles.progressPercentage}>
                    {group.progress}%
                  </span>
                </div>
              </div>

              {/* 작업 목록 */}
              {isExpanded && (
                <div className={styles.tasksList}>
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onStatusChange={onTaskStatusChange}
                      onDelete={onTaskDelete}
                      onProgressChange={onTaskProgressChange}
                    />
                  ))}

                  {/* 작업 추가 폼 */}
                  {addingTaskGroup === group.id && (
                    <div className={styles.addTaskForm}>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="작업 제목을 입력하세요..."
                        className={styles.addTaskInput}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitTask(group.id);
                          } else if (e.key === 'Escape') {
                            handleCancelAdd();
                          }
                        }}
                      />
                      <div className={styles.addTaskActions}>
                        <button
                          onClick={() => handleSubmitTask(group.id)}
                          className={styles.confirmButton}
                          title="추가"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelAdd}
                          className={styles.cancelButton}
                          title="취소"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
