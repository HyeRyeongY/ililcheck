"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, FileText, Plus, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/auth";
import { fetchProjects } from "@/lib/api";
import { checkAdminStatus } from "@/lib/admin";
import type { Project, ProjectCategory, Task } from "@/lib/types";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import styles from "./Sidebar.module.css";

const navigation = [
  { name: "오늘의 할 일", href: "/dashboard/today", icon: Calendar },
  { name: "달력", href: "/dashboard/calendar", icon: Calendar },
  { name: "보고서", href: "/dashboard/reports", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<ProjectCategory>("personal");
  const [projectsWithLocalProgress, setProjectsWithLocalProgress] = useState<Project[]>([]);

  const calculateProjectProgressFromLocal = (projectId: string): { progress: number; completedTasks: number; totalTasks: number } => {
    try {
      const savedTasks = localStorage.getItem(`project_tasks_${projectId}`);
      if (!savedTasks) return { progress: 0, completedTasks: 0, totalTasks: 0 };

      const tasks: Task[] = JSON.parse(savedTasks);
      if (tasks.length === 0) return { progress: 0, completedTasks: 0, totalTasks: 0 };

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.progress === 100).length;

      // 작업 진행률의 평균 계산
      const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
      const progress = Math.round(totalProgress / totalTasks);
      
      return { progress, completedTasks, totalTasks };
    } catch (error) {
      console.error("로컬 진행률 계산 실패:", error);
      return { progress: 0, completedTasks: 0, totalTasks: 0 };
    }
  };

  // 프로젝트들에 로컬 진행률 적용
  const updateProjectsWithLocalProgress = (projectList: Project[]) => {
    const updatedProjects = projectList.map((project) => {
      const { progress, completedTasks, totalTasks } = calculateProjectProgressFromLocal(project.id);
      return {
        ...project,
        progress,
        completedTasks,
        totalTasks,
      };
    });
    setProjectsWithLocalProgress(updatedProjects);
  };

  const loadProjects = async () => {
    if (!user) {
      setProjects([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // 프로젝트 로드
      const userProjects = await fetchProjects();
      setProjects(userProjects);

      // 로컬 진행률 적용
      updateProjectsWithLocalProgress(userProjects);

      // 관리자 권한 확인
      const adminStatus = await checkAdminStatus(user.uid);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error("프로젝트 로드 실패:", error);
      setProjects([]);
      setProjectsWithLocalProgress([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  // URL 기반으로 현재 카테고리 초기화
  useEffect(() => {
    if (pathname.startsWith('/dashboard/projects/')) {
      // 현재 프로젝트 ID 추출
      const projectId = pathname.split('/').pop();
      if (projectId && projectsWithLocalProgress.length > 0) {
        const currentProject = projectsWithLocalProgress.find(p => p.id === projectId);
        if (currentProject) {
          setCurrentCategory(currentProject.category || 'personal');
        }
      }
    }
  }, [pathname, projectsWithLocalProgress]);

  // 로컬 스토리지 변경 감지를 위한 useEffect (다른 탭에서의 변경)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // `project_tasks_`로 시작하는 키가 변경되었을 때만 실행
      if (event.key?.startsWith("project_tasks_")) {
        console.log("로컬 스토리지 변경 감지:", event.key);
        updateProjectsWithLocalProgress(projects);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [projects]);

  // 프로젝트 업데이트 이벤트 감지
  useEffect(() => {
    const handleProjectUpdate = (event: CustomEvent) => {
      const { projectId, updates } = event.detail;
      console.log("프로젝트 업데이트 감지:", { projectId, updates });

      // 프로젝트 목록에서 해당 프로젝트 업데이트
      setProjects((prevProjects) => {
        const updatedProjects = prevProjects.map((project) =>
          project.id === projectId ? { ...project, ...updates } : project
        );

        // 로컬 진행률도 함께 업데이트
        updateProjectsWithLocalProgress(updatedProjects);

        return updatedProjects;
      });
    };

    window.addEventListener("projectUpdated", handleProjectUpdate as EventListener);

    return () => {
      window.removeEventListener("projectUpdated", handleProjectUpdate as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleProjectCreated = (newProject: Project) => {
    // 프로젝트 목록 상태를 직접 업데이트
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    updateProjectsWithLocalProgress(updatedProjects);
    
    // 생성된 프로젝트 페이지로 이동
    router.push(`/dashboard/projects/${newProject.id}`);
  };

  // 탭 전환 시 첫 번째 프로젝트로 자동 이동
  const handleCategoryChange = (category: ProjectCategory) => {
    setCurrentCategory(category);

    // 해당 카테고리의 첫 번째 프로젝트로 이동
    const categoryProjects = projectsWithLocalProgress.filter(
      (project) => (project.category || "personal") === category
    );

    if (categoryProjects.length > 0) {
      router.push(`/dashboard/projects/${categoryProjects[0].id}`);
    } else {
      // 프로젝트가 없으면 대시보드로 이동
      router.push("/dashboard");
    }
  };

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>일일 업무 관리</h1>
      </div>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button
          onClick={() => handleCategoryChange("personal")}
          className={`${styles.tab} ${
            currentCategory === "personal" ? styles.tabPersonal : styles.tabInactive
          }`}
        >
          <Home className="inline-block w-4 h-4 mr-2" />
          개인
        </button>
        <button
          onClick={() => handleCategoryChange("work")}
          className={`${styles.tab} ${
            currentCategory === "work" ? styles.tabWork : styles.tabInactive
          }`}
        >
          <FileText className="inline-block w-4 h-4 mr-2" />
          업무
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className={styles.navigation}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${styles.navLink} ${
                isActive ? styles.navLinkActive : styles.navLinkInactive
              }`}
            >
              <item.icon
                className={`${styles.navIcon} ${
                  isActive ? styles.navIconActive : styles.navIconInactive
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* 프로젝트 목록 */}
      <div className={styles.projects}>
        <div className={styles.projectsHeader}>
          <h2 className={styles.projectsTitle}>프로젝트</h2>
          <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className={styles.projectsList}>
          {projectsWithLocalProgress
            .filter((project) => (project.category || "personal") === currentCategory)
            .map((project) => {
              const isCurrentProject = pathname === `/dashboard/projects/${project.id}`;
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className={`${styles.projectLink} ${
                    isCurrentProject ? styles.projectLinkActive : ""
                  }`}
                >
                  <div className={styles.projectItem}>
                    <div className={styles.projectContent}>
                      <div className={styles.projectLeft}>
                        <div
                          className={styles.projectColor}
                          style={{ backgroundColor: project.color }}
                        />
                        <p className={styles.projectName}>{project.name}</p>
                      </div>
                    </div>
                    <div className={styles.projectProgressContainer}>
                      <span className={styles.taskCount}>
                        {project.completedTasks ?? 0}/{project.totalTasks ?? 0}
                      </span>
                      <span className={styles.projectProgress}>{project.progress}%</span>
                    </div>
                    {/* 진행률 바 */}
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{
                          backgroundColor: project.color,
                          width: `${project.progress}%`,
                        }}
                      />
                    </div>
                    <div className={styles.projectPeriod}>
                      <p className={styles.projectDates}>
                        {project.startDate} ~ {project.endDate}
                      </p>
                      <p className={styles.projectDaysRemaining}>D-{project.daysRemaining}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
      {/* Master 또는 Manager: 관리자 페이지 링크 */}
      {isAdmin && (
        <div className={styles.adminLink}>
          <Link
            href="/admin"
            className={`${styles.navLink}  ${
              pathname === "/admin" ? styles.navLinkActive : styles.navLinkInactive
            }`}
          >
            <Shield
              className={`${styles.navIcon} ${
                pathname === "/admin" ? styles.navIconActive : styles.navIconInactive
              }`}
            />
            관리자
          </Link>
        </div>
      )}
      {/* 로그아웃 버튼 */}
      <div className={styles.logoutSection}>
        <div className={styles.userInfo}>
          <p className={styles.userEmail}>{user?.email}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <LogOut className={styles.logoutIcon} />
          로그아웃
        </button>
      </div>

      {/* 프로젝트 생성 모달 */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProjectCreated}
        defaultCategory={currentCategory}
      />
    </div>
  );
}
