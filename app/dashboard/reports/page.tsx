"use client";

import Header from "@/components/layout/Header";
import MiniLineChart from "@/components/ui/MiniLineChart";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/contexts/AuthContext";
import { useCategory } from "@/contexts/CategoryContext";
import { fetchProjects, updateAllProjectStats } from "@/lib/api";
import { Project, ProjectReport } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";
import styles from "./page.module.css";
import React from "react";

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
  const { currentCategory } = useCategory();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // 기간 모드: 'today' 또는 'custom'
  const [periodMode, setPeriodMode] = useState<"today" | "custom">("today");
  // 오늘 날짜를 기본값으로 설정
  const todayString = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "personal" | "work"
  >("all");
  const [isUpdating, setIsUpdating] = useState(false);

  // 통계 업데이트 핸들러
  const handleUpdateStats = async () => {
    setIsUpdating(true);
    try {
      await updateAllProjectStats();
      // 업데이트 후 프로젝트 다시 불러오기
      const userProjects = await fetchProjects();
      setProjects(userProjects);
      alert('모든 프로젝트 통계가 업데이트되었습니다.');
    } catch (error) {
      console.error('통계 업데이트 실패:', error);
      alert('통계 업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // URL 파라미터 또는 CategoryContext에서 카테고리 초기화
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam === "personal" || categoryParam === "work") {
      setSelectedCategory(categoryParam);
    } else {
      // URL 파라미터가 없으면 CategoryContext의 현재 카테고리 사용
      setSelectedCategory(currentCategory);
    }
  }, [searchParams, currentCategory]);

  useEffect(() => {
    async function loadData() {
      console.log("=== loadData 시작 ===");
      console.log("user:", user);

      if (!user) {
        console.log("user 없음, 데이터 초기화");
        setProjects([]);
        return;
      }

      console.log("데이터 fetch 시작");
      setDataLoading(true);
      try {
        console.log("fetchProjects 호출 중...");
        const userProjects = await fetchProjects();
        console.log(
          "✅ 로드된 프로젝트:",
          userProjects.length,
          "개",
          userProjects
        );

        setProjects(userProjects);
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

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // 카테고리별 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    if (selectedCategory === "all") return projects;
    return projects.filter(p => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  // 프로젝트별 상세 보고서 계산 (프로젝트 캐시 값 사용)
  const projectReports: ProjectReport[] = useMemo(() => {
    console.log("=== 프로젝트 보고서 계산 시작 (캐시 사용) ===");
    console.log(
      "필터링된 프로젝트 수:",
      filteredProjects.length,
      filteredProjects
    );

    return filteredProjects.map(project => {
      console.log(`\n--- 프로젝트 "${project.name}" (ID: ${project.id}) ---`);

      // 프로젝트 문서에 저장된 캐시 값 사용
      const totalTasks = project.totalTasks || 0;
      const completedTasks = project.completedTasks || 0;
      const totalTodos = project.totalTodos || 0;
      const completedTodos = project.completedTodos || 0;

      console.log(`  캐시된 작업: ${completedTasks}/${totalTasks}`);
      console.log(`  캐시된 할일: ${completedTodos}/${totalTodos}`);

      // 진행률 계산
      const taskProgress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const todoProgress =
        totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

      // 프로젝트 진행률은 프로젝트 문서에 저장된 값 사용
      const overallProgress = project.progress || 0;

      // 프로젝트 시작일부터 오늘까지의 진행 히스토리 계산
      const progressHistory = calculateProgressHistory(project);

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
  }, [filteredProjects]);

  // 진행 히스토리 계산 함수 (시작일~종료일 범위, 오늘 이후는 null)
  function calculateProgressHistory(project: Project) {
    const history: { date: string; progress: number | null }[] = [];
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // 시작일부터 종료일까지의 전체 기간
    const totalDays = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysUntilToday = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 샘플링 개수 결정 (최소 3개, 최대 10개)
    const sampleCount = Math.min(10, Math.max(3, Math.floor(totalDays / 7)));

    // 현재 진행률
    const currentProgress = project.progress || 0;

    for (let i = 0; i <= sampleCount; i++) {
      const dayOffset = Math.floor((totalDays / sampleCount) * i);
      const sampleDate = new Date(
        start.getTime() + dayOffset * 24 * 60 * 60 * 1000
      );
      sampleDate.setHours(0, 0, 0, 0);
      const dateStr = sampleDate.toISOString().split("T")[0];

      // 오늘 이후의 날짜는 null로 설정 (그래프가 끊어짐)
      if (sampleDate > today) {
        history.push({ date: dateStr, progress: null });
      } else {
        // 시작일부터 현재까지 선형 증가로 근사
        const progressAtPoint =
          dayOffset <= daysUntilToday
            ? Math.round(
                (currentProgress / Math.max(1, daysUntilToday)) * dayOffset
              )
            : currentProgress;
        history.push({ date: dateStr, progress: progressAtPoint });
      }
    }

    return history;
  }

  // 전체 통계 계산 - 프로젝트 캐시 값 합산
  const totalStats = useMemo(() => {
    const stats = filteredProjects.reduce(
      (acc, project) => {
        return {
          totalTasks: acc.totalTasks + (project.totalTasks || 0),
          completedTasks: acc.completedTasks + (project.completedTasks || 0),
          totalTodos: acc.totalTodos + (project.totalTodos || 0),
          completedTodos: acc.completedTodos + (project.completedTodos || 0),
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
  }, [filteredProjects]);

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
        dateRange
        showExport
        onDateRangeChange={handleDateRangeChange}
      />

      <div className={styles.content}>
        <div className={`${styles.wrapper} ${styles.space}`}>
          {/* 필터 및 기간 선택 */}
          <div className={styles.filterSection}>
            {/* 카테고리 필터 */}
            <div className={styles.categoryFilter}>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`${styles.filterButton} ${
                  selectedCategory === "all" ? styles.filterButtonActive : ""
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedCategory("personal")}
                className={`${styles.filterButton} ${
                  selectedCategory === "personal"
                    ? styles.filterButtonActive
                    : ""
                }`}
              >
                개인
              </button>
              <button
                onClick={() => setSelectedCategory("work")}
                className={`${styles.filterButton} ${
                  selectedCategory === "work" ? styles.filterButtonActive : ""
                }`}
              >
                업무
              </button>
              {/* 통계 업데이트 버튼 (개발용) */}
              <button
                onClick={handleUpdateStats}
                disabled={isUpdating}
                className={styles.updateStatsButton}
                title="모든 프로젝트의 할일 통계를 업데이트합니다"
              >
                {isUpdating ? "업데이트 중..." : "📊 통계 업데이트"}
              </button>
            </div>

            {/* 기간 선택 토글 및 DatePicker */}
            <div className={styles.periodSelector}>
              <div className={styles.periodToggle}>
                <button
                  onClick={() => {
                    setPeriodMode("today");
                    setStartDate(todayString);
                    setEndDate(todayString);
                  }}
                  className={`${styles.toggleButton} ${
                    periodMode === "today" ? styles.toggleButtonActive : ""
                  }`}
                >
                  오늘
                </button>
                <button
                  onClick={() => setPeriodMode("custom")}
                  className={`${styles.toggleButton} ${
                    periodMode === "custom" ? styles.toggleButtonActive : ""
                  }`}
                >
                  기간 선택
                </button>
              </div>

              {periodMode === "custom" && (
                <DatePicker
                  selectsRange={true}
                  startDate={startDate ? new Date(startDate) : null}
                  endDate={endDate ? new Date(endDate) : null}
                  onChange={update => {
                    const [start, end] = update;
                    setStartDate(
                      start
                        ? new Date(
                            start.getTime() - start.getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .split("T")[0]
                        : todayString
                    );
                    setEndDate(
                      end
                        ? new Date(
                            end.getTime() - end.getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .split("T")[0]
                        : todayString
                    );
                  }}
                  customInput={
                    <CustomDateInput
                      value={
                        startDate ? `${startDate} - ${endDate || ""}` : ""
                      }
                    />
                  }
                  dateFormat="yyyy-MM-dd"
                  locale={ko}
                />
              )}
            </div>
          </div>

          {/* 보고서 헤더 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              {periodMode === "today"
                ? dateString
                : `${startDate} ~ ${endDate}`}
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
                projectReports.map(report => (
                  <div
                    key={report.id}
                    className={styles.projectItem}
                    style={{ borderColor: report.color }}
                  >
                    <div className={styles.projectHeader}>
                      <div className={styles.projectInfo}>
                        <h4 className={styles.projectName}>{report.name}</h4>
                        <div className={styles.projectDetailStats}>
                          <p className={styles.projectStatItem}>
                            작업: {report.completedTasks}/{report.totalTasks} (
                            {report.taskProgress}%)
                          </p>
                          <p className={styles.projectStatItem}>
                            할일: {report.completedTodos}/{report.totalTodos} (
                            {report.todoProgress}%)
                          </p>
                        </div>
                      </div>
                      <div className={styles.projectRightSection}>
                        <MiniLineChart
                          data={report.progressHistory}
                          color={report.color}
                        />
                        <span className={styles.projectProgress}>
                          {report.overallProgress}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      progress={report.overallProgress}
                      color={report.color}
                      showLabel={false}
                    />
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
