'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Project, TaskGroup, Task } from '@/lib/types';
import TaskItem from './TaskItem';
import styles from './ProjectDetailCard.module.css';

interface ProjectDetailCardProps {
  project: Project;
  taskGroups: TaskGroup[];
  onTaskStatusChange: (taskId: string, status: Task['status']) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskProgressChange?: (taskId: string, progress: number) => void;
}

export default function ProjectDetailCard({
  project,
  taskGroups,
  onTaskStatusChange,
  onTaskDelete,
  onTaskProgressChange,
}: ProjectDetailCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
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
                  <Plus className={styles.addIcon} />
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
