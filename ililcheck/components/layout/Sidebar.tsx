'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';

const navigation = [
  { name: '개인', href: '/dashboard', icon: Home },
  { name: '오늘의 할 일', href: '/dashboard/today', icon: Calendar },
  { name: '달력', href: '/dashboard/calendar', icon: Calendar },
  { name: '보고서', href: '/dashboard/reports', icon: FileText },
];

interface SidebarProps {
  projects: Project[];
}

export default function Sidebar({ projects }: SidebarProps) {
  const pathname = usePathname();
  const currentTab = pathname.includes('업무') ? '업무' : '개인';

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* 헤더 */}
      <div className="p-4">
        <h1 className="text-lg font-semibold text-gray-900">일일 업무 관리</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 px-4 mb-4">
        <button
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            currentTab === '개인'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Home className="inline-block w-4 h-4 mr-2" />
          개인
        </button>
        <button
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            currentTab === '업무'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <FileText className="inline-block w-4 h-4 mr-2" />
          업무
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* 프로젝트 목록 */}
      <div className="flex-1 px-3">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            프로젝트
          </h2>
          <button className="rounded-md p-1 hover:bg-gray-100">
            <Plus className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="space-y-1 mt-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block"
            >
              <div className="group rounded-lg px-3 py-2 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="h-3 w-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {project.daysRemaining}일 남음
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {project.progress}%
                  </span>
                </div>
                {/* 진행률 바 */}
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor: project.color,
                      width: `${project.progress}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {project.startDate} ~ {project.endDate}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
