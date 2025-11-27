'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjects, fetchTaskGroups } from '@/lib/api';
import { Project, TaskGroup } from '@/lib/types';
import Header from '@/components/layout/Header';
import ProgressBar from '@/components/ui/ProgressBar';
import styles from './page.module.css';

export default function ReportsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setProjects([]);
        setTaskGroups([]);
        setLoading(false);
        return;
      }

      try {
        const [userProjects, userTaskGroups] = await Promise.all([
          fetchProjects(),
          fetchTaskGroups(),
        ]);
        setProjects(userProjects);
        setTaskGroups(userTaskGroups);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 통계 계산
  const allTasks = taskGroups.flatMap((group) => group.tasks);
  const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress').length;
  const todoTasks = allTasks.filter((t) => t.status === 'todo').length;
  const onHoldTasks = allTasks.filter((t) => t.status === 'on_hold').length;
  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 프로젝트별 통계
  const projectStats = projects.map((project) => {
    const projectTaskGroups = taskGroups.filter((g) => g.projectId === project.id);
    const projectTasks = projectTaskGroups.flatMap((g) => g.tasks);
    const projectCompleted = projectTasks.filter((t) => t.status === 'completed').length;
    const projectTotal = projectTasks.length;
    const projectProgress = projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      progress: projectProgress,
      tasksCompleted: projectCompleted,
      totalTasks: projectTotal,
      color: project.color,
    };
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  const today = new Date();
  const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]}요일`;

  return (
    <div className={styles.container}>
      <Header title="업무 보고서" dateRange showExport />

      <div className={styles.content}>
        <div className={`${styles.wrapper} ${styles.space}`}>
          {/* 보고서 헤더 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>업무 보고서</h2>
            <p className={styles.cardText}>{dateString}</p>
          </div>

          {/* 완료율 섹션 */}
          <div className={styles.blueCard}>
            <div className={styles.completionHeader}>
              <div className={styles.completionInfo}>
                <h3 className={styles.completionTitle}>완료율</h3>
                <p className={styles.completionText}>
                  {completedTasks}/{totalTasks} 작업 완료
                </p>
              </div>
              <span className={styles.completionRate}>
                {completionRate}%
              </span>
            </div>
            <ProgressBar progress={completionRate} size="lg" showLabel={false} />
          </div>

          {/* 상태별 통계 */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueBlue}`}>
                {inProgressTasks}
              </div>
              <div className={styles.statLabel}>진행 중</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueGray}`}>
                {todoTasks}
              </div>
              <div className={styles.statLabel}>시작전</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueOrange}`}>
                {onHoldTasks}
              </div>
              <div className={styles.statLabel}>보류</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueGreen}`}>
                {completedTasks}
              </div>
              <div className={styles.statLabel}>완료</div>
            </div>
          </div>

          {/* 프로젝트별 현황 */}
          <div className={styles.projectsCard}>
            <h3 className={styles.projectsTitle}>
              프로젝트별 현황
            </h3>
            <div className={styles.projectsList}>
              {projectStats.length === 0 ? (
                <p className={styles.emptyState}>아직 프로젝트가 없습니다.</p>
              ) : (
                projectStats.map((project) => (
                  <div key={project.id} className={styles.projectItem} style={{ borderColor: project.color }}>
                    <div className={styles.projectHeader}>
                      <div className={styles.projectInfo}>
                        <h4 className={styles.projectName}>{project.name}</h4>
                        <p className={styles.projectStats}>
                          {project.tasksCompleted}/{project.totalTasks} 작업 완료
                        </p>
                      </div>
                      <span className={styles.projectProgress}>{project.progress}%</span>
                    </div>
                    <ProgressBar progress={project.progress} color={project.color} showLabel={false} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 메모 섹션 */}
          <div className={styles.memoCard}>
            <h3 className={styles.memoTitle}>메모</h3>
            <textarea
              placeholder="보고서에 추가할 메모를 입력하세요..."
              className={styles.textarea}
              rows={6}
            />
            <div className={styles.buttonGroup}>
              <button className={styles.buttonCancel}>
                취소
              </button>
              <button className={styles.buttonSave}>
                <span className={styles.buttonContent}>
                  저장
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
