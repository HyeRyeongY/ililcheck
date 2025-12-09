'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjects, fetchTasksByProject } from '@/lib/api';
import { Project, Task, Todo } from '@/lib/types';
import styles from './page.module.css';

type ViewMode = 'calendar' | 'gantt';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setProjects([]);
        setAllTasks([]);
        setLoading(false);
        return;
      }

      try {
        const userProjects = await fetchProjects();
        setProjects(userProjects);

        // 모든 프로젝트의 작업 로드
        const allProjectTasks: Task[] = [];
        for (const project of userProjects) {
          const projectTasks = await fetchTasksByProject(project.id);
          allProjectTasks.push(...projectTasks);
        }
        setAllTasks(allProjectTasks);
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

  // 모든 할일 추출
  const allTodos = allTasks.flatMap(task => 
    task.todos.map(todo => ({ ...todo, taskTitle: task.title, projectId: task.projectId }))
  );

  // 선택된 날짜의 할일 가져오기
  const selectedDateTodos = allTodos.filter(todo => {
    if (!todo.dueDate) return false;
    return todo.dueDate === format(selectedDate, 'yyyy-MM-dd');
  });

  const inProgressCount = allTodos.filter((t) => t.status === 'in_progress').length;
  const completedCount = allTodos.filter((t) => t.status === 'completed').length;
  const onHoldCount = allTodos.filter((t) => t.status === 'on_hold' || !t.dueDate).length;
  const totalCount = allTodos.length;
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
          {/* 탭 */}
          <div className={styles.tabs}>
            <button
              onClick={() => setViewMode('calendar')}
              className={`${styles.tab} ${viewMode === 'calendar' ? styles.tabActive : ''}`}
            >
              일별 작업
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`${styles.tab} ${viewMode === 'gantt' ? styles.tabActive : ''}`}
            >
              프로젝트 타임라인
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {viewMode === 'calendar' ? (
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

                // 해당 날짜의 할일 수
                const dayTodos = allTodos.filter(todo => {
                  if (!todo.dueDate) return false;
                  return todo.dueDate === format(day, 'yyyy-MM-dd');
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

                    {/* 할일 점 표시 */}
                    {dayTodos.length > 0 && (
                      <div className={styles.taskDots}>
                        {dayTodos.slice(0, 3).map((todo) => (
                          <div
                            key={todo.id}
                            className={`${styles.taskDot} ${
                              todo.status === 'completed' ? styles.taskDotCompleted : styles.taskDotInProgress
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
                {selectedDateTodos.length}개의 할 일
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

            {/* 선택된 날짜의 할일 목록 */}
            <div className={styles.projectsSection}>
              <h3 className={styles.projectsSectionTitle}>이 날의 할일</h3>

              <div className={styles.projectsList}>
                {selectedDateTodos.length === 0 ? (
                  <p className={styles.emptyState}>이 날에는 할일이 없습니다.</p>
                ) : (
                  selectedDateTodos.map((todo) => {
                    const project = projects.find(p => p.id === todo.projectId);

                    return (
                      <div key={todo.id} className={styles.projectItem}>
                        <div className={styles.projectItemHeader}>
                          <div className={styles.todoItemContent}>
                            <div className={`${styles.todoStatusDot} ${styles[todo.status]}`} />
                            <div className={styles.todoDetails}>
                              <h4 className={styles.projectItemTitle}>{todo.title}</h4>
                              <p className={styles.todoProjectInfo}>
                                <span className={styles.todoTaskTitle}>{todo.taskTitle}</span>
                                {project && (
                                  <>
                                    <span className={styles.todoDivider}>•</span>
                                    <span
                                      className={styles.todoProjectName}
                                      style={{ color: project.color }}
                                    >
                                      {project.name}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className={styles.ganttContainer}>
            <div className={styles.ganttContent}>
              <h2 className={styles.ganttTitle}>프로젝트 타임라인</h2>

              {projects.length === 0 ? (
                <p className={styles.emptyState}>프로젝트가 없습니다.</p>
              ) : (
                <div className={styles.ganttList}>
                  {projects.map((project) => {
                    const projectTasks = allTasks.filter(task => task.projectId === project.id);

                    // 프로젝트의 시작일과 종료일 계산
                    let projectStart: Date | null = null;
                    let projectEnd: Date | null = null;

                    projectTasks.forEach(task => {
                      task.todos.forEach(todo => {
                        if (todo.dueDate) {
                          const todoDate = new Date(todo.dueDate);
                          if (!projectStart || todoDate < projectStart) {
                            projectStart = todoDate;
                          }
                          if (!projectEnd || todoDate > projectEnd) {
                            projectEnd = todoDate;
                          }
                        }
                      });
                    });

                    return (
                      <div key={project.id} className={styles.ganttProject}>
                        <div className={styles.ganttProjectHeader}>
                          <div className={styles.ganttProjectInfo}>
                            <div
                              className={styles.ganttProjectColorDot}
                              style={{ backgroundColor: project.color }}
                            />
                            <h3 className={styles.ganttProjectName}>{project.name}</h3>
                          </div>
                          <div className={styles.ganttProjectDates}>
                            {projectStart && projectEnd ? (
                              <>
                                <span className={styles.ganttDate}>
                                  {format(projectStart, 'yyyy.MM.dd')}
                                </span>
                                <span className={styles.ganttDateSeparator}>~</span>
                                <span className={styles.ganttDate}>
                                  {format(projectEnd, 'yyyy.MM.dd')}
                                </span>
                              </>
                            ) : (
                              <span className={styles.ganttNoDate}>날짜 미정</span>
                            )}
                          </div>
                        </div>

                        {/* 프로젝트의 작업 목록 */}
                        <div className={styles.ganttTasks}>
                          {projectTasks.map((task) => {
                            // 작업의 시작일과 종료일 계산
                            let taskStart: Date | null = null;
                            let taskEnd: Date | null = null;

                            task.todos.forEach(todo => {
                              if (todo.dueDate) {
                                const todoDate = new Date(todo.dueDate);
                                if (!taskStart || todoDate < taskStart) {
                                  taskStart = todoDate;
                                }
                                if (!taskEnd || todoDate > taskEnd) {
                                  taskEnd = todoDate;
                                }
                              }
                            });

                            return (
                              <div key={task.id} className={styles.ganttTask}>
                                <div className={styles.ganttTaskHeader}>
                                  <span className={styles.ganttTaskTitle}>{task.title}</span>
                                  <div className={styles.ganttTaskDates}>
                                    {taskStart && taskEnd ? (
                                      <>
                                        <span className={styles.ganttTaskDate}>
                                          {format(taskStart, 'MM.dd')}
                                        </span>
                                        <span className={styles.ganttDateSeparator}>~</span>
                                        <span className={styles.ganttTaskDate}>
                                          {format(taskEnd, 'MM.dd')}
                                        </span>
                                      </>
                                    ) : (
                                      <span className={styles.ganttNoDate}>날짜 미정</span>
                                    )}
                                  </div>
                                </div>

                                {/* 할일 목록 */}
                                <div className={styles.ganttTodos}>
                                  {task.todos
                                    .filter(todo => todo.dueDate)
                                    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
                                    .map((todo) => (
                                      <div key={todo.id} className={styles.ganttTodo}>
                                        <div className={`${styles.ganttTodoStatus} ${styles[todo.status]}`} />
                                        <span className={styles.ganttTodoTitle}>{todo.title}</span>
                                        <span className={styles.ganttTodoDate}>
                                          {format(new Date(todo.dueDate!), 'MM.dd')}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
