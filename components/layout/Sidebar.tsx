"use client";

import CreateProjectModal from "@/components/modals/CreateProjectModal";
import { useAuth } from "@/contexts/AuthContext";
import { useCategory } from "@/contexts/CategoryContext";
import { fetchProjects } from "@/lib/api";
import type { Project, ProjectCategory } from "@/lib/types";
import { Calendar, FileText, Home, NotepadText, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Sidebar.module.css";

const navigation = [
  { name: "오늘의 할 일", href: "/dashboard/today", icon: NotepadText },
  { name: "달력", href: "/dashboard/calendar", icon: Calendar },
  { name: "보고서", href: "/dashboard/reports", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { currentCategory, setCurrentCategory } = useCategory();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      // 프로젝트 로드
      const userProjects = await fetchProjects();
      setProjects(userProjects);
    } catch (error) {
      console.error("프로젝트 로드 실패:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  // 윈도우 포커스 시 프로젝트 목록 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadProjects();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  // URL 기반으로 현재 카테고리 초기화
  useEffect(() => {
    if (pathname.startsWith("/dashboard/projects/")) {
      // 현재 프로젝트 ID 추출
      const projectId = pathname.split("/").pop();
      if (projectId && projects.length > 0) {
        const currentProject = projects.find(p => p.id === projectId);
        if (currentProject) {
          setCurrentCategory(currentProject.category || "personal");
        }
      }
    }
  }, [pathname, projects]);

  // 프로젝트 업데이트 이벤트 감지
  useEffect(() => {
    const handleProjectUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { projectId, updates } = customEvent.detail;
      console.log("프로젝트 업데이트 감지:", { projectId, updates });

      // Firebase에서 최신 프로젝트 목록 다시 가져오기
      try {
        const userProjects = await fetchProjects();
        setProjects(userProjects);
      } catch (error) {
        console.error("프로젝트 목록 새로고침 실패:", error);
        // 실패 시 로컬 state만 업데이트
        setProjects(prevProjects =>
          prevProjects.map(project =>
            project.id === projectId ? { ...project, ...updates } : project
          )
        );
      }
    };

    window.addEventListener("projectUpdated", handleProjectUpdate);

    return () => {
      window.removeEventListener("projectUpdated", handleProjectUpdate);
    };
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    // 프로젝트 목록 상태를 직접 업데이트
    setProjects([...projects, newProject]);

    // 생성된 프로젝트 페이지로 이동
    router.push(`/dashboard/projects/${newProject.id}`);
  };

  // 탭 전환 시 동작 처리
  const handleCategoryChange = (category: ProjectCategory) => {
    setCurrentCategory(category);

    // 현재 프로젝트 페이지에 있는지 확인
    const isOnProjectPage = pathname.startsWith("/dashboard/projects/");
    const isOnReportsPage = pathname === "/dashboard/reports";

    // 보고서 페이지에 있는 경우 URL 파라미터로 카테고리 전달
    if (isOnReportsPage) {
      router.push(`/dashboard/reports?category=${category}`);
      return;
    }

    // 프로젝트 페이지에 있는 경우에만 해당 카테고리의 첫 번째 프로젝트로 이동
    if (isOnProjectPage) {
      const categoryProjects = projects.filter(
        project => (project.category || "personal") === category
      );

      if (categoryProjects.length > 0) {
        router.push(`/dashboard/projects/${categoryProjects[0].id}`);
      } else {
        // 프로젝트가 없으면 대시보드로 이동
        router.push("/dashboard");
      }
    }
    // 다른 페이지(오늘의 할일, 달력)에 있으면 현재 페이지 유지하면서 카테고리만 변경
  };

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      {/* <div className={styles.header}>
        <h1 className={styles.headerTitle}>ililcheck</h1>
      </div> */}

      {/* 탭 */}
      <div className={styles.tabs}>
        <button
          onClick={() => handleCategoryChange("personal")}
          className={`${styles.tab} ${
            currentCategory === "personal"
              ? styles.tabPersonal
              : styles.tabInactive
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
        {navigation.map(item => {
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
          <button
            className={styles.addButton}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className={styles.projectsList}>
          {projects
            .filter(
              project => (project.category || "personal") === currentCategory
            )
            .map(project => {
              const isCurrentProject =
                pathname === `/dashboard/projects/${project.id}`;
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
                      <span className={styles.projectProgress}>
                        {project.progress ?? 0}%
                      </span>
                    </div>
                    {/* 진행률 바 */}
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{
                          backgroundColor: project.color,
                          width: `${project.progress ?? 0}%`,
                        }}
                      />
                    </div>
                    <div className={styles.projectPeriod}>
                      <p className={styles.projectDates}>
                        {project.startDate} ~ {project.endDate || '무기한'}
                      </p>
                      <p className={styles.projectDaysRemaining}>
                        {project.daysRemaining !== null && project.daysRemaining !== undefined
                          ? `D${project.daysRemaining}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
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
