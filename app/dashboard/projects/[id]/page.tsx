'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjects, fetchTaskGroups } from '@/lib/api';
import { Project, TaskGroup } from '@/lib/types';
import ProgressBar from '@/components/ui/ProgressBar';
import styles from './page.module.css';

// 색상 팔레트
const colorPalette = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#f97316', // orange
  '#14b8a6', // teal
  '#ec4899', // pink
  '#84cc16', // lime
];

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user || !params.id) {
        setProject(null);
        setTaskGroups([]);
        setLoading(false);
        return;
      }

      try {
        const [allProjects, allTaskGroups] = await Promise.all([
          fetchProjects(),
          fetchTaskGroups(),
        ]);

        const currentProject = allProjects.find(p => p.id === params.id);
        setProject(currentProject || null);

        const projectTaskGroups = allTaskGroups.filter(g => g.projectId === params.id);
        setTaskGroups(projectTaskGroups);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, params.id]);

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

  const totalTasks = taskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
  const completedTasks = taskGroups.reduce(
    (sum, g) => sum + g.tasks.filter(t => t.status === 'completed').length,
    0
  );

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div
              className={styles.projectColorBox}
              style={{ backgroundColor: project.color }}
            />
            <h1 className={styles.title}>{project.name}</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={styles.settingsButton}
          >
            설정
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.contentInner}>
          {/* 프로젝트 개요 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>프로젝트 개요</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>시작일</label>
                <div className={styles.dateField}>
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className={styles.dateText}>{project.startDate || '-'}</span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>종료일</label>
                <div className={styles.dateField}>
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className={styles.dateText}>{project.endDate || '-'}</span>
                </div>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <label className={styles.label}>전체 진행률</label>
                <span className={styles.progressValue}>{project.progress}%</span>
              </div>
              <ProgressBar progress={project.progress} color={project.color} showLabel={false} />
              <p className={styles.progressSubtext}>
                {completedTasks}/{totalTasks} 작업 완료
              </p>
            </div>
          </div>

          {/* 작업 목록 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>작업 목록</h2>
            {taskGroups.length === 0 ? (
              <p className={styles.emptyState}>아직 작업 그룹이 없습니다.</p>
            ) : (
              <div className={styles.tasksSection}>
                {taskGroups.map((group) => (
                  <div key={group.id} className={styles.taskGroup}>
                    <div className={styles.taskGroupHeader}>
                      <h3 className={styles.taskGroupTitle}>{group.name}</h3>
                      <span className={styles.taskGroupCount}>{group.tasks.length}개</span>
                    </div>
                    <div className={styles.taskGroupProgress}>
                      <ProgressBar progress={group.progress} color={project.color} size="sm" showLabel={false} />
                    </div>
                    <div className={styles.taskList}>
                      {group.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`${styles.task} ${
                            task.status === 'completed' ? styles.taskCompleted : styles.taskDefault
                          }`}
                        >
                          <div className={styles.taskContent}>
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              className={styles.taskCheckbox}
                              readOnly
                            />
                            <div className={styles.taskBody}>
                              <p className={`${styles.taskTitle} ${
                                task.status === 'completed' ? styles.taskTitleCompleted : ''
                              }`}>
                                {task.title}
                              </p>
                              <div className={styles.taskProgressContainer}>
                                <div className={styles.taskProgressBar}>
                                  <div
                                    className={`${styles.taskProgressFill} ${
                                      task.status === 'completed' ? styles.taskProgressFillCompleted : styles.taskProgressFillDefault
                                    }`}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <span className={styles.taskProgressText}>{task.progress}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 설정 사이드바 */}
      {showSettings && (
        <div className={styles.settingsOverlay} onClick={() => setShowSettings(false)}>
          <div
            className={styles.settingsSidebar}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.settingsHeader}>
              <h2 className={styles.settingsTitle}>프로젝트 상세정보</h2>
              <button
                onClick={() => setShowSettings(false)}
                className={styles.closeButton}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className={styles.settingsContent}>
              {/* 프로젝트 이름 */}
              <div>
                <label className={styles.label}>
                  프로젝트 이름
                </label>
                <input
                  type="text"
                  defaultValue={project.name}
                  className={styles.inputField}
                />
              </div>

              {/* 프로젝트 색상 */}
              <div>
                <label className={styles.label}>
                  프로젝트 색상
                </label>
                <div className={styles.colorPalette}>
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      className={`${styles.colorButton} ${
                        project.color === color ? styles.colorButtonSelected : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* 날짜 */}
              <div className={styles.gridTwo}>
                <div>
                  <label className={styles.label}>
                    시작일
                  </label>
                  <input
                    type="date"
                    defaultValue={project.startDate}
                    className={styles.inputField}
                  />
                </div>
                <div>
                  <label className={styles.label}>
                    종료일
                  </label>
                  <input
                    type="date"
                    defaultValue={project.endDate}
                    className={styles.inputField}
                  />
                </div>
              </div>

              {/* 프로젝트 설명 */}
              <div>
                <label className={styles.label}>
                  프로젝트 설명
                </label>
                <textarea
                  defaultValue={project.description}
                  rows={4}
                  className={styles.textareaField}
                  placeholder="프로젝트에 대한 설명을 입력하세요..."
                />
              </div>

              {/* 작업 목록 */}
              <div>
                <label className={styles.label}>
                  작업 목록
                </label>
                <div className={styles.taskGroupList}>
                  {taskGroups.map((group) => (
                    <div key={group.id} className={styles.taskGroupItem}>
                      <div className={styles.taskGroupItemContent}>
                        <div className={styles.taskGroupItemTitle}>{group.name}</div>
                        <div className={styles.taskGroupItemProgress}>{group.progress}%</div>
                      </div>
                      <ProgressBar progress={group.progress} color={project.color} size="sm" className={styles.taskGroupItemProgressBar} showLabel={false} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
