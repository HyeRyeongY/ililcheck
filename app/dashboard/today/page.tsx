'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ProgressVisualization from '@/components/dashboard/ProgressVisualization';
import FilterButtons from '@/components/dashboard/FilterButtons';
import ProjectDetailCard from '@/components/dashboard/ProjectDetailCard';
import { Task, TaskFilterType, TaskStats, Project, TaskGroup } from '@/lib/types';
import { updateTaskProgress, updateTask, deleteTask as deleteTaskAPI, fetchProjects, fetchTaskGroups } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function TodayPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<TaskFilterType>('all');
  const [tasks, setTasks] = useState<TaskGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 사용자 데이터 로드
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setTasks([]);
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const [userProjects, userTaskGroups] = await Promise.all([
          fetchProjects(),
          fetchTaskGroups(),
        ]);
        setProjects(userProjects);
        setTasks(userTaskGroups);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 모든 작업 가져오기
  const allTasks = tasks.flatMap((group) => group.tasks);

  // 통계 계산
  const stats: TaskStats = {
    total: allTasks.length,
    inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
    completed: allTasks.filter((t) => t.status === 'completed').length,
    onHold: allTasks.filter((t) => t.status === 'on_hold').length,
  };

  // 필터링된 작업 그룹
  const filteredTaskGroups = tasks.map((group) => ({
    ...group,
    tasks:
      activeFilter === 'all'
        ? group.tasks
        : group.tasks.filter((task) => task.status === activeFilter),
  })).filter((group) => group.tasks.length > 0);

  // 작업 상태 변경
  const handleTaskStatusChange = async (taskId: string, status: Task['status']) => {
    // UI 즉시 업데이트
    setTasks((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) =>
          task.id === taskId ? { ...task, status, progress: status === 'completed' ? 100 : task.progress } : task
        ),
      }))
    );

    // Firebase에 동기화
    setIsSyncing(true);
    await updateTask(taskId, { status, progress: status === 'completed' ? 100 : undefined });
    setIsSyncing(false);
  };

  // 작업 진행률 변경
  const handleTaskProgressChange = async (taskId: string, progress: number) => {
    // UI 즉시 업데이트
    setTasks((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) =>
          task.id === taskId ? { ...task, progress, status: progress >= 100 ? 'completed' : task.status } : task
        ),
      }))
    );

    // Firebase에 동기화
    setIsSyncing(true);
    await updateTaskProgress(taskId, progress);
    setIsSyncing(false);
  };

  // 작업 삭제
  const handleTaskDelete = async (taskId: string) => {
    // UI 즉시 업데이트
    setTasks((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) => task.id !== taskId),
      }))
    );

    // Firebase에 동기화
    setIsSyncing(true);
    await deleteTaskAPI(taskId);
    setIsSyncing(false);
  };

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
      {/* 헤더 */}
      <DashboardHeader
        currentDate={dateString}
        workWeek={`${stats.completed}/${stats.total} 작업 완료`}
        stats={stats}
      />

      {/* 메인 컨텐츠 */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* 진행 상황 시각화 */}
          <ProgressVisualization stats={stats} />

          {/* 필터 버튼 */}
          <FilterButtons
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            stats={stats}
          />

          {/* 프로젝트별 작업 목록 */}
          <div className={styles.projectsContainer}>
            {projects.length === 0 ? (
              <div className={styles.emptyState}>
                <p>아직 프로젝트가 없습니다. 프로젝트를 추가해보세요!</p>
              </div>
            ) : (
              projects.map((project) => {
                const projectTaskGroups = filteredTaskGroups.filter(
                  (group) => group.projectId === project.id
                );

                if (projectTaskGroups.length === 0) return null;

                return (
                  <ProjectDetailCard
                    key={project.id}
                    project={project}
                    taskGroups={projectTaskGroups}
                    onTaskStatusChange={handleTaskStatusChange}
                    onTaskDelete={handleTaskDelete}
                    onTaskProgressChange={handleTaskProgressChange}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
