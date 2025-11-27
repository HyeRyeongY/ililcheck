'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { X, Calendar as CalendarIcon, Palette } from 'lucide-react';
import ProgressBar from '@/components/ui/ProgressBar';

// 색상 팔레트
const colorPalette = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#f97316', // orange
  '#14b8a6', // teal
  '#ec4899', // pink
  '#84cc16', // lime
];

export default function ProjectDetailPage() {
  const params = useParams();
  const [showSettings, setShowSettings] = useState(false);

  // 임시 데이터 (나중에 API에서 가져올 예정)
  const project = {
    id: params.id,
    name: 'Q4 Marketing Campaign',
    color: '#3b82f6',
    description: 'Q4 마케팅 캠페인 프로젝트',
    progress: 33,
    startDate: '2025-11-12',
    endDate: '2025-12-03',
    taskGroups: [
      {
        id: '1',
        name: 'Content Creation',
        progress: 40,
        tasks: [
          { id: 't1', title: 'Write blog post about new features', status: 'completed', progress: 100 },
          { id: 't2', title: 'Create product demo video', status: 'in_progress', progress: 60 },
          { id: 't3', title: 'Design infographic for social media', status: 'todo', progress: 0 },
        ],
      },
      {
        id: '2',
        name: 'Social Media Strategy',
        progress: 50,
        tasks: [
          { id: 't4', title: 'Plan Q4 content calendar', status: 'completed', progress: 100 },
          { id: 't5', title: 'Schedule Instagram posts', status: 'in_progress', progress: 70 },
        ],
      },
    ],
  };

  const totalTasks = project.taskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
  const completedTasks = project.taskGroups.reduce(
    (sum, g) => sum + g.tasks.filter(t => t.status === 'completed').length,
    0
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            설정
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 프로젝트 개요 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">프로젝트 개요</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">시작일</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{project.startDate}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">종료일</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{project.endDate}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">전체 진행률</label>
                <span className="text-sm font-semibold text-gray-900">{project.progress}%</span>
              </div>
              <ProgressBar progress={project.progress} color={project.color} showLabel={false} />
              <p className="text-xs text-gray-500 mt-2">
                {completedTasks}/{totalTasks} 작업 완료
              </p>
            </div>
          </div>

          {/* 작업 목록 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">작업 목록</h2>
            <div className="space-y-6">
              {project.taskGroups.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">{group.name}</h3>
                    <span className="text-xs text-gray-500">{group.tasks.length}개</span>
                  </div>
                  <div className="mb-3">
                    <ProgressBar progress={group.progress} color={project.color} size="sm" showLabel={false} />
                  </div>
                  <div className="space-y-2 pl-4">
                    {group.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`
                          p-3 rounded-md border transition-colors
                          ${task.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            className="mt-0.5"
                            readOnly
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">{task.progress}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 설정 사이드바 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSettings(false)}>
          <div
            className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">프로젝트 상세정보</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 프로젝트 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트 이름
                </label>
                <input
                  type="text"
                  defaultValue={project.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 프로젝트 색상 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트 색상
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      className={`
                        w-full aspect-square rounded-lg transition-all
                        ${project.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    defaultValue={project.startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    defaultValue={project.endDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 프로젝트 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트 설명
                </label>
                <textarea
                  defaultValue={project.description}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="프로젝트에 대한 설명을 입력하세요..."
                />
              </div>

              {/* 작업 목록 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작업 목록
                </label>
                <div className="space-y-2">
                  {project.taskGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-50 rounded-md">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{group.progress}%</div>
                      </div>
                      <ProgressBar progress={group.progress} color={project.color} size="sm" className="w-20" showLabel={false} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
