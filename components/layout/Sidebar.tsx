'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, FileText, Plus, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { fetchProjects } from '@/lib/api';
import type { Project } from '@/lib/types';
import styles from './Sidebar.module.css';

const navigation = [
  { name: '개인', href: '/dashboard', icon: Home },
  { name: '오늘의 할 일', href: '/dashboard/today', icon: Calendar },
  { name: '달력', href: '/dashboard/calendar', icon: Calendar },
  { name: '보고서', href: '/dashboard/reports', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const currentTab = pathname.includes('업무') ? '업무' : '개인';
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const userProjects = await fetchProjects();
        setProjects(userProjects);
      } catch (error) {
        console.error('프로젝트 로드 실패:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
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
          className={`${styles.tab} ${
            currentTab === '개인' ? styles.tabPersonal : styles.tabInactive
          }`}
        >
          <Home className="inline-block w-4 h-4 mr-2" />
          개인
        </button>
        <button
          className={`${styles.tab} ${
            currentTab === '업무' ? styles.tabWork : styles.tabInactive
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
          <h2 className={styles.projectsTitle}>
            프로젝트
          </h2>
          <button className={styles.addButton}>
            <Plus className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className={styles.projectsList}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className={styles.projectLink}
            >
              <div className={styles.projectItem}>
                <div className={styles.projectContent}>
                  <div className={styles.projectLeft}>
                    <div
                      className={styles.projectColor}
                      style={{ backgroundColor: project.color }}
                    />
                    <div className={styles.projectInfo}>
                      <p className={styles.projectName}>
                        {project.name}
                      </p>
                      <p className={styles.projectDaysRemaining}>
                        {project.daysRemaining}일 남음
                      </p>
                    </div>
                  </div>
                  <span className={styles.projectProgress}>
                    {project.progress}%
                  </span>
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
                <p className={styles.projectDates}>
                  {project.startDate} ~ {project.endDate}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

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
    </div>
  );
}
