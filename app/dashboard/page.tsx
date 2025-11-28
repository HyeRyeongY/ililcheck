"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects } from "@/lib/api";
import { Project, ProjectCategory } from "@/lib/types";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // URL 파라미터나 기본값으로 카테고리 결정
  const category = (searchParams.get('category') as ProjectCategory) || 'personal';

  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const allProjects = await fetchProjects();
        setProjects(allProjects);
      } catch (error) {
        console.error("프로젝트 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  const categoryProjects = projects.filter(
    project => (project.category || 'personal') === category
  );

  const categoryLabel = category === 'personal' ? '개인' : '업무';

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h2 className={styles.emptyTitle}>
            {categoryLabel} 프로젝트가 없습니다
          </h2>
          <p className={styles.emptyDescription}>
            새로운 {categoryLabel} 프로젝트를 생성하여 작업을 시작해보세요.
          </p>
        </div>
      </div>
    </div>
  );
}
