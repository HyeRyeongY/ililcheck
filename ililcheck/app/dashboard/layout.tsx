import Sidebar from '@/components/layout/Sidebar';
import type { Project } from '@/lib/types';

// 임시 데이터
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Q4 Marketing Campaign',
    color: '#3b82f6',
    description: 'Q4 마케팅 캠페인',
    startDate: '11월 12일',
    endDate: '12월 3일',
    progress: 33,
    daysRemaining: 7,
  },
  {
    id: '2',
    name: 'Website Redesign',
    color: '#8b5cf6',
    description: '웹사이트 리디자인',
    startDate: '10월 27일',
    endDate: '12월 10일',
    progress: 50,
    daysRemaining: 14,
  },
  {
    id: '3',
    name: 'Mobile App Development',
    color: '#ef4444',
    description: '모바일 앱 개발',
    startDate: '11월 26일',
    endDate: '1월 25일',
    progress: 0,
    daysRemaining: 60,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar projects={mockProjects} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
