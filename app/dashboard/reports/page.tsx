'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjects, fetchTaskGroups } from '@/lib/api';
import { Project, TaskGroup, ProjectReport } from '@/lib/types';
import Header from '@/components/layout/Header';
import ProgressBar from '@/components/ui/ProgressBar';
import MiniLineChart from '@/components/ui/MiniLineChart';
import styles from './page.module.css';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // 오늘 날짜를 기본값으로 설정
  const todayString = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'personal' | 'work'>('all');

  useEffect(() => {
    async function loadData() {
      console.log('loadData 시작, user:', user);

      if (!user) {
        console.log('user 없음, 데이터 초기화');
        setProjects([]);
        setTaskGroups([]);
        return;
      }

      console.log('데이터 fetch 시작');
      setDataLoading(true);
      try {
        const [userProjects, userTaskGroups] = await Promise.all([
          fetchProjects(),
          fetchTaskGroups(),
        ]);
        console.log('로드된 프로젝트:', userProjects);
        console.log('로드된 작업그룹:', userTaskGroups);
        setProjects(userProjects);
        setTaskGroups(userTaskGroups);
        console.log('setState 완료');
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        console.log('데이터 로딩 완료');
        setDataLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // 카테고리별 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') return projects;
    return projects.filter(p => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  // 날짜 범위에 따른 필터링 함수 (useMemo로 메모이제이션)
  const isInDateRange = useMemo(() => {
    return (dateStr?: string) => {
      if (!dateStr) return false; // 완료일이 없으면 제외

      const itemDate = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);

      // 시작일 00:00:00, 종료일 23:59:59로 설정
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return itemDate >= start && itemDate <= end;
    };
  }, [startDate, endDate]);

  // 프로젝트별 상세 보고서 계산
  const projectReports: ProjectReport[] = useMemo(() => {
    console.log('프로젝트 보고서 계산 시작');
    console.log('날짜 범위:', startDate, '~', endDate);
    console.log('필터링된 프로젝트:', filteredProjects.length);
    console.log('전체 작업그룹:', taskGroups.length);

    return filteredProjects.map((project) => {
      const projectTaskGroups = taskGroups.filter((g) => g.projectId === project.id);
      console.log(`프로젝트 "${project.name}"의 작업그룹:`, projectTaskGroups.length);

      // 작업(Task) 통계
      const projectTasks = projectTaskGroups.flatMap((g) => g.tasks);
      console.log(`프로젝트 "${project.name}"의 전체 작업:`, projectTasks.length);

      // 전체 작업 수
      const totalTasks = projectTasks.length;
      // 완료된 작업 수 (날짜 필터링 제거)
      const completedTasks = projectTasks.filter((t) => t.status === 'completed').length;
      console.log(`프로젝트 "${project.name}"의 완료 작업:`, completedTasks, '/', totalTasks);

      // 할일(Todo) 통계
      const allTodos = projectTasks.flatMap((t) => t.todos);

      // 전체 할일 수
      const totalTodos = allTodos.length;
      // 완료된 할일 수 (날짜 필터링 제거)
      const completedTodos = allTodos.filter((todo) => todo.status === 'completed').length;
      console.log(`프로젝트 "${project.name}"의 전체 할일:`, totalTodos, ', 완료:', completedTodos);

      // 진행률 계산 - 전체 대비 날짜 범위 내 완료된 비율
      const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const todoProgress = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

      // 전체 진행률 (작업, 할일의 평균)
      const overallProgress = Math.round((taskProgress + todoProgress) / 2);

      // 프로젝트 시작일부터 오늘까지의 진행 히스토리 계산
      const progressHistory = calculateProgressHistory(project, projectTasks);

      return {
        id: project.id,
        name: project.name,
        color: project.color,
        totalTasks,
        completedTasks,
        totalTodos,
        completedTodos,
        taskProgress,
        todoProgress,
        overallProgress,
        progressHistory,
      };
    });
  }, [filteredProjects, taskGroups, isInDateRange]);

  // 진행 히스토리 계산 함수
  function calculateProgressHistory(project: Project, tasks: any[]) {
    const history: { date: string; progress: number }[] = [];
    const start = new Date(project.startDate);
    const today = new Date();

    // 프로젝트 시작일부터 오늘까지 일주일 간격으로 샘플링
    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const sampleCount = Math.min(10, Math.max(3, Math.floor(daysDiff / 7))); // 최소 3개, 최대 10개 포인트

    for (let i = 0; i <= sampleCount; i++) {
      const sampleDate = new Date(start.getTime() + (daysDiff / sampleCount) * i * 24 * 60 * 60 * 1000);
      const dateStr = sampleDate.toISOString().split('T')[0];

      // 해당 날짜까지 완료된 작업과 할일 계산
      const completedTasksAtDate = tasks.filter((t) =>
        t.status === 'completed' && t.completedDate && new Date(t.completedDate) <= sampleDate
      ).length;

      const completedTodosAtDate = tasks.flatMap((t) => t.todos).filter((todo: any) =>
        todo.status === 'completed' && todo.completedDate && new Date(todo.completedDate) <= sampleDate
      ).length;

      const totalTodos = tasks.flatMap((t) => t.todos).length;
      const totalItems = tasks.length + totalTodos;
      const completedItems = completedTasksAtDate + completedTodosAtDate;

      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      history.push({ date: dateStr, progress });
    }

    return history;
  }

  // 전체 통계 계산 - 카테고리 필터 적용
  const filteredTaskGroups = useMemo(() => {
    if (selectedCategory === 'all') return taskGroups;
    const categoryProjectIds = filteredProjects.map(p => p.id);
    return taskGroups.filter(g => categoryProjectIds.includes(g.projectId));
  }, [taskGroups, selectedCategory, filteredProjects]);

  const allTasks = filteredTaskGroups.flatMap((group) => group.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress').length;
  const todoTasks = allTasks.filter((t) => t.status === 'todo').length;
  const onHoldTasks = allTasks.filter((t) => t.status === 'on_hold').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const loading = authLoading || dataLoading;

  console.log('렌더링, authLoading:', authLoading, 'dataLoading:', dataLoading, 'user:', user, 'projects:', projects.length, 'taskGroups:', taskGroups.length);

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
      <Header
        title="업무 보고서"
        dateRange
        showExport
        onDateRangeChange={handleDateRangeChange}
      />

      <div className={styles.content}>
        <div className={`${styles.wrapper} ${styles.space}`}>
          {/* 보고서 헤더 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>업무 보고서</h2>
                <p className={styles.cardText}>{dateString}</p>
              </div>
              <div className={styles.categoryFilter}>
                <button
                  className={`${styles.categoryButton} ${selectedCategory === 'all' ? styles.categoryButtonActive : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  전체
                </button>
                <button
                  className={`${styles.categoryButton} ${selectedCategory === 'personal' ? styles.categoryButtonActive : ''}`}
                  onClick={() => setSelectedCategory('personal')}
                >
                  개인
                </button>
                <button
                  className={`${styles.categoryButton} ${selectedCategory === 'work' ? styles.categoryButtonActive : ''}`}
                  onClick={() => setSelectedCategory('work')}
                >
                  업무
                </button>
              </div>
            </div>
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
              {projectReports.length === 0 ? (
                <p className={styles.emptyState}>아직 프로젝트가 없습니다.</p>
              ) : (
                projectReports.map((report) => (
                  <div key={report.id} className={styles.projectItem} style={{ borderColor: report.color }}>
                    <div className={styles.projectHeader}>
                      <div className={styles.projectInfo}>
                        <h4 className={styles.projectName}>{report.name}</h4>
                        <div className={styles.projectDetailStats}>
                          <p className={styles.projectStatItem}>
                            작업: {report.completedTasks}/{report.totalTasks} ({report.taskProgress}%)
                          </p>
                          <p className={styles.projectStatItem}>
                            할일: {report.completedTodos}/{report.totalTodos} ({report.todoProgress}%)
                          </p>
                        </div>
                      </div>
                      <div className={styles.projectRightSection}>
                        <MiniLineChart data={report.progressHistory} color={report.color} />
                        <span className={styles.projectProgress}>{report.overallProgress}%</span>
                      </div>
                    </div>
                    <ProgressBar progress={report.overallProgress} color={report.color} showLabel={false} />
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
