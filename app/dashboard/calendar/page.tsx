'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTaskGroups, fetchProjects } from '@/lib/api';
import { TaskGroup, Project } from '@/lib/types';
import styles from './page.module.css';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setTaskGroups([]);
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const [userTaskGroups, userProjects] = await Promise.all([
          fetchTaskGroups(),
          fetchProjects(),
        ]);
        setTaskGroups(userTaskGroups);
        setProjects(userProjects);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 선택된 날짜의 작업 가져오기
  const allTasks = taskGroups.flatMap((group) => group.tasks);
  const selectedDateTasks = allTasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return isSameDay(taskDate, selectedDate);
  });

  const inProgressCount = allTasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = allTasks.filter((t) => t.status === 'completed').length;
  const onHoldCount = allTasks.filter((t) => t.status === 'on_hold').length;
  const totalCount = allTasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>달력</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainGrid}>
          {/* 달력 */}
          <div className={styles.calendarContainer}>
            {/* 달력 헤더 */}
            <div className={styles.calendarHeader}>
              <div className={styles.calendarControls}>
                <button
                  onClick={goToToday}
                  className={styles.todayButton}
                >
                  오늘
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className={styles.navButton}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className={styles.navButton}
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h2 className={styles.monthTitle}>
                {format(currentDate, 'yyyy년 MM월', { locale: ko })}
              </h2>
            </div>

            {/* 요일 헤더 */}
            <div className={styles.weekdaysGrid}>
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`${styles.weekday} ${
                    index === 0 ? styles.weekdaySunday : index === 6 ? styles.weekdaySaturday : ''
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const dayOfWeek = day.getDay();

                // 해당 날짜의 작업 수
                const dayTasks = allTasks.filter(task => {
                  if (!task.dueDate) return false;
                  const taskDate = new Date(task.dueDate);
                  return isSameDay(taskDate, day);
                });

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`${styles.dayCell} ${
                      !isCurrentMonth ? styles.dayCellOtherMonth : ''
                    } ${isSelected ? styles.dayCellSelected : ''}`}
                  >
                    <span
                      className={`${styles.dayNumber} ${
                        isToday ? styles.dayNumberToday : ''
                      } ${
                        dayOfWeek === 0 ? styles.dayNumberSunday : dayOfWeek === 6 ? styles.dayNumberSaturday : ''
                      } ${
                        !isCurrentMonth && !isToday ? styles.dayNumberOtherMonth : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* 작업 점 표시 */}
                    {dayTasks.length > 0 && (
                      <div className={styles.taskDots}>
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className={`${styles.taskDot} ${
                              task.status === 'completed' ? styles.taskDotCompleted : styles.taskDotInProgress
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 우측 사이드바 - 선택된 날짜 상세 */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>
                {format(selectedDate, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
              </h2>
              <p className={styles.sidebarSubtitle}>
                {selectedDateTasks.length}개의 할 일
              </p>
            </div>

            {/* 전체 진행률 */}
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>전체 진행률</span>
                <span className={styles.progressValue}>{completionRate}%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarFill} style={{ width: `${completionRate}%` }} />
              </div>
              <div className={styles.progressStats}>
                <div className={styles.progressStat}>
                  <div className={`${styles.progressStatDot} ${styles.progressStatDotBlue}`} />
                  <span className={styles.progressStatText}>진행 중 ({inProgressCount})</span>
                </div>
                <div className={styles.progressStat}>
                  <div className={`${styles.progressStatDot} ${styles.progressStatDotGreen}`} />
                  <span className={styles.progressStatText}>완료 ({completedCount})</span>
                </div>
                <div className={styles.progressStat}>
                  <div className={`${styles.progressStatDot} ${styles.progressStatDotOrange}`} />
                  <span className={styles.progressStatText}>보류 ({onHoldCount})</span>
                </div>
              </div>
            </div>

            {/* 프로젝트 목록 */}
            <div className={styles.projectsSection}>
              <h3 className={styles.projectsSectionTitle}>프로젝트</h3>

              <div className={styles.projectsList}>
                {projects.length === 0 ? (
                  <p className={styles.emptyState}>프로젝트가 없습니다.</p>
                ) : (
                  projects.map((project) => {
                    const projectTaskGroups = taskGroups.filter(g => g.projectId === project.id);
                    const projectTasks = projectTaskGroups.flatMap(g => g.tasks);

                    return (
                      <div key={project.id} className={styles.projectItem}>
                        <div className={styles.projectItemHeader}>
                          <h4 className={styles.projectItemTitle}>{project.name}</h4>
                          <button className={styles.projectItemAddButton}>+ 추가</button>
                        </div>
                        <div className={styles.projectTasks}>
                          {projectTaskGroups.map((group) => (
                            <div key={group.id} className={styles.projectTask}>
                              <input type="checkbox" className={styles.projectTaskCheckbox} readOnly />
                              <span className={styles.projectTaskTitle}>{group.name}</span>
                              <span className={styles.projectTaskCount}>{group.tasks.length}개</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
