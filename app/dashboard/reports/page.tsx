"use client";

import Header from "@/components/layout/Header";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects, fetchTasks } from "@/lib/api";
import { Project, ProjectReport, Task } from "@/lib/types";
import { ko } from "date-fns/locale";
import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./page.module.css";

// 커스텀 날짜 입력 컴포넌트
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

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // 기간 모드: 'today' 또는 'custom'
  const [periodMode, setPeriodMode] = useState<"today" | "custom">("today");
  // 오늘 날짜를 기본값으로 설정
  const todayString = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  // DatePicker 표시 여부
  const [showDatePicker, setShowDatePicker] = useState(false);
  // DatePicker 내부에서 임시로 선택 중인 날짜 (확정 전)
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  // DatePicker ref 추가
  const datePickerRef = React.useRef<DatePicker>(null);

  useEffect(() => {
    async function loadData() {
      console.log("=== loadData 시작 ===");
      console.log("user:", user);

      if (!user) {
        console.log("user 없음, 데이터 초기화");
        setProjects([]);
        setTasks([]);
        return;
      }

      console.log("데이터 fetch 시작");
      setDataLoading(true);
      try {
        console.log("fetchProjects 및 fetchTasks 호출 중...");
        const [userProjects, userTasks] = await Promise.all([
          fetchProjects(),
          fetchTasks()
        ]);
        console.log(
          "✅ 로드된 프로젝트:",
          userProjects.length,
          "개",
          userProjects
        );
        console.log(
          "✅ 로드된 작업:",
          userTasks.length,
          "개",
          userTasks
        );

        setProjects(userProjects);
        setTasks(userTasks);
        console.log("✅ setState 완료");
      } catch (error) {
        console.error("❌ 데이터 로드 실패:", error);
      } finally {
        console.log("데이터 로딩 완료");
        setDataLoading(false);
      }
    }

    loadData();
  }, [user]);

  // 날짜를 문자열로 변환하는 헬퍼 함수 (yyyy-MM-dd 형식)
  const formatDateString = (date: Date | null) => {
    if (!date) return todayString;
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  // 날짜를 표시용 문자열로 변환 (yyyy년 mm월 dd일 형식)
  const formatDisplayDate = (date: Date | null) => {
    if (!date) {
      const parts = todayString.split('-');
      return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
    }
    const dateStr = formatDateString(date);
    const parts = dateStr.split('-');
    return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
  };

  // 선택된 기간에 맞는 작업 필터링
  const filteredTasks = useMemo(() => {
    // 시작일 00:00:00 ~ 종료일 23:59:59
    const startDateStr = formatDateString(startDate);
    const endDateStr = formatDateString(endDate);

    console.log(`=== 작업 필터링: ${startDateStr} ~ ${endDateStr} ===`);

    return tasks.filter(task => {
      // 완료된 작업: completedDate가 기간 내에 있는지 확인
      if (task.status === 'completed' && task.completedDate) {
        const completedDateStr = task.completedDate.split('T')[0];
        const isInRange = completedDateStr >= startDateStr && completedDateStr <= endDateStr;
        console.log(`  [완료] ${task.title}: ${completedDateStr} => ${isInRange ? '✓' : '✗'}`);
        return isInRange;
      }

      // 진행 중인 작업: startDate가 기간 내에 있는지 확인
      if (task.status === 'in_progress' && task.startDate) {
        const taskStartDateStr = task.startDate.split('T')[0];
        const isInRange = taskStartDateStr >= startDateStr && taskStartDateStr <= endDateStr;
        console.log(`  [진행중] ${task.title}: ${taskStartDateStr} => ${isInRange ? '✓' : '✗'}`);
        return isInRange;
      }

      return false;
    });
  }, [tasks, startDate, endDate]);

  // 프로젝트별로 필터링된 작업 그룹화
  const projectTasksMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      const projectTasks = map.get(task.projectId) || [];
      projectTasks.push(task);
      map.set(task.projectId, projectTasks);
    });
    return map;
  }, [filteredTasks]);

  // 필터링된 작업이 있는 프로젝트만 표시
  const filteredProjects = useMemo(() => {
    const projectIds = new Set(filteredTasks.map(task => task.projectId));
    return projects.filter(project => projectIds.has(project.id));
  }, [projects, filteredTasks]);

  // 프로젝트별 상세 보고서 계산 (선택된 기간의 작업 기반)
  const projectReports: ProjectReport[] = useMemo(() => {
    console.log("=== 프로젝트 보고서 계산 시작 (기간 필터링) ===");
    console.log(
      "필터링된 작업 수:",
      filteredTasks.length,
      filteredTasks
    );

    return filteredProjects.map(project => {
      console.log(`\n--- 프로젝트 "${project.name}" (ID: ${project.id}) ---`);

      // 해당 프로젝트의 필터링된 작업들
      const projectTasks = projectTasksMap.get(project.id) || [];

      // 완료된 작업 수
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const totalTasks = projectTasks.length;

      // 할일 통계 계산
      let totalTodos = 0;
      let completedTodos = 0;

      projectTasks.forEach(task => {
        task.todos.forEach(todo => {
          // 기간 내 작업에 속한 모든 할일을 카운트
          totalTodos++;
          if (todo.status === 'completed') {
            completedTodos++;
          }
        });
      });

      console.log(`  기간 내 작업: ${completedTasks}/${totalTasks}`);
      console.log(`  기간 내 할일: ${completedTodos}/${totalTodos}`);

      // 진행률 계산
      const taskProgress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const todoProgress =
        totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

      // 전체 진행률 계산
      const totalItems = totalTasks + totalTodos;
      const completedItems = completedTasks + completedTodos;
      const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      // 선택한 기간의 간단한 진행 히스토리 (시작: 0%, 종료: 현재 진행률)
      const progressHistory = [
        { date: formatDateString(startDate), progress: 0 },
        { date: formatDateString(endDate), progress: overallProgress }
      ];

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
  }, [filteredProjects, filteredTasks, projectTasksMap, startDate, endDate]);

  // 전체 통계 계산 - 필터링된 작업 기반
  const totalStats = useMemo(() => {
    const stats = projectReports.reduce(
      (acc, report) => {
        return {
          totalTasks: acc.totalTasks + report.totalTasks,
          completedTasks: acc.completedTasks + report.completedTasks,
          totalTodos: acc.totalTodos + report.totalTodos,
          completedTodos: acc.completedTodos + report.completedTodos,
        };
      },
      { totalTasks: 0, completedTasks: 0, totalTodos: 0, completedTodos: 0 }
    );

    // 전체 진행률: (완료된 작업 + 완료된 할일) / (전체 작업 + 전체 할일) * 100
    const totalItems = stats.totalTasks + stats.totalTodos;
    const completedItems = stats.completedTasks + stats.completedTodos;
    const completionRate =
      totalItems > 0
        ? Math.round((completedItems / totalItems) * 100)
        : 0;

    return { ...stats, completionRate };
  }, [projectReports]);

  const loading = authLoading || dataLoading;

  console.log(
    "렌더링, authLoading:",
    authLoading,
    "dataLoading:",
    dataLoading,
    "user:",
    user,
    "projects:",
    projects.length
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  const today = new Date();
  const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${["일", "월", "화", "수", "목", "금", "토"][today.getDay()]}요일`;

  return (
    <div className={styles.container}>
      <Header
        title="업무 보고서"
        showExport
      />

      <div className={styles.content}>
        <div className={`${styles.wrapper} ${styles.space}`}>
          {/* 기간 선택 */}
          <div className={styles.filterSection}>
            <div className={styles.periodSelector}>
              <div className={styles.periodToggle}>
                <button
                  onClick={() => {
                    setPeriodMode("today");
                    const today = new Date();
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  className={`${styles.toggleButton} ${
                    periodMode === "today" ? styles.toggleButtonActive : ""
                  }`}
                >
                  오늘
                </button>
                <button
                  onClick={() => {
                    setPeriodMode("custom");
                    setShowDatePicker(true);
                  }}
                  className={`${styles.toggleButton} ${
                    periodMode === "custom" ? styles.toggleButtonActive : ""
                  }`}
                >
                  기간 선택
                </button>
              </div>

              {/* 선택된 날짜 표시 */}
              <div className={styles.dateDisplay}>
                {periodMode === "today"
                  ? formatDisplayDate(new Date())
                  : `${formatDisplayDate(startDate)} ~ ${formatDisplayDate(endDate)}`}
              </div>

              {/* DatePicker - 기간 선택 모드이고 showDatePicker가 true일 때만 표시 */}
              {periodMode === "custom" && showDatePicker && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, marginTop: '0.5rem' }}>
                  <DatePicker
                    ref={datePickerRef}
                    selectsRange={true}
                    startDate={tempStartDate || startDate}
                    endDate={tempEndDate}
                    onChange={(update) => {
                      const [start, end] = update as [Date | null, Date | null];

                      // 임시 날짜 저장
                      setTempStartDate(start);
                      setTempEndDate(end);

                      // 시작일과 종료일이 모두 선택되었을 때만 실제로 적용
                      if (start && end) {
                        // 시작일은 00:00:00으로 설정
                        const startOfDay = new Date(start);
                        startOfDay.setHours(0, 0, 0, 0);

                        // 종료일은 23:59:59로 설정
                        const endOfDay = new Date(end);
                        endOfDay.setHours(23, 59, 59, 999);

                        setStartDate(startOfDay);
                        setEndDate(endOfDay);

                        // DatePicker 자동 닫기
                        setTimeout(() => {
                          setShowDatePicker(false);
                          setTempStartDate(null);
                          setTempEndDate(null);
                        }, 100);
                      }
                    }}
                    inline
                    dateFormat="yyyy-MM-dd"
                    locale={ko}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 보고서 헤더 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              {periodMode === "today"
                ? dateString
                : `${formatDisplayDate(startDate)} ~ ${formatDisplayDate(endDate)}`}
            </h2>
            <div className={styles.completionHeader}>
              <div className={styles.completionInfo}>
                <h3 className={styles.completionTitle}>완료율</h3>
                <p className={styles.completionText}>
                  {totalStats.completedTasks}/{totalStats.totalTasks} 작업 완료
                </p>
              </div>
              <span className={styles.completionRate}>
                {totalStats.completionRate}%
              </span>
            </div>
            <ProgressBar
              progress={totalStats.completionRate}
              size="lg"
              showLabel={false}
            />
            {/* 상태별 통계 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>완료</div>
                <div className={`${styles.statValue} ${styles.statValueGreen}`}>
                  {totalStats.completedTasks}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>진행 중</div>
                <div className={`${styles.statValue} ${styles.statValueBlue}`}>
                  {totalStats.totalTasks - totalStats.completedTasks}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>시작 전</div>
                <div className={`${styles.statValue} ${styles.statValueGray}`}>
                  {totalStats.totalTodos - totalStats.completedTodos}
                </div>
              </div>
            </div>
          </div>

          {/* 프로젝트별 현황 */}
          <div className={styles.projectsCard}>
            <h3 className={styles.projectsTitle}>프로젝트별 현황</h3>
            <div className={styles.projectsList}>
              {projectReports.length === 0 ? (
                <p className={styles.emptyState}>아직 프로젝트가 없습니다.</p>
              ) : (
                projectReports.map(report => {
                  const projectTasks = projectTasksMap.get(report.id) || [];

                  return (
                    <div key={report.id} className={styles.projectItem}>
                      <div
                        className={styles.projectColorBar}
                        style={{ backgroundColor: report.color }}
                      />
                      <div className={styles.projectContent}>
                        {/* 프로젝트 헤더 - 간략한 통계 */}
                        <div className={styles.projectHeader}>
                          <div className={styles.projectInfo}>
                            <h4 className={styles.projectName}>{report.name}</h4>
                            <div className={styles.todoBadge}>
                                작업 {report.completedTasks}/{report.totalTasks} 완료&nbsp;•&nbsp;할 일 {report.completedTodos}/{report.totalTodos} 완료&nbsp;•&nbsp;진행률 {report.overallProgress}%
                            </div>
                          </div>
                        </div>

                        {/* 작업 목록 */}
                        <div className={styles.tasksList}>
                          {projectTasks.map(task => (
                            <div key={task.id} className={styles.taskItem}>
                              <div className={styles.taskHeader}>
                                <div className={styles.taskTitleRow}>
                                  <span className={styles.taskTitle}>{task.title}</span>
                                  <span className={styles.taskProgress}>{task.progress}%</span>
                                </div>
                              </div>

                              {/* 할일 목록 */}
                              {task.todos.length > 0 && (
                                <div className={styles.todosList}>
                                  {task.todos.map(todo => (
                                    <div key={todo.id} className={styles.todoItem}>
                                      <div className={styles.todoTitleRow}>
                                        <span className={styles.todoIcon}>└</span>
                                        <span className={styles.todoTitle}>{todo.title}</span>
                                        <span className={styles.todoProgress}>{todo.progress}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
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
              <button className={styles.buttonCancel}>취소</button>
              <button className={styles.buttonSave}>
                <span className={styles.buttonContent}>저장</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
