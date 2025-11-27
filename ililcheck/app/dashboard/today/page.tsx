'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Calendar, MoreVertical, Clock } from 'lucide-react';
import ProgressBar from '@/components/ui/ProgressBar';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  progress: number;
  dueDate?: string;
}

interface TaskGroup {
  id: string;
  name: string;
  progress: number;
  tasks: Task[];
}

interface Project {
  id: string;
  name: string;
  color: string;
  progress: number;
  taskGroups: TaskGroup[];
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Q4 Marketing Campaign',
    color: '#3b82f6',
    progress: 40,
    taskGroups: [
      {
        id: '1-1',
        name: 'Content Creation',
        progress: 53,
        tasks: [
          { id: 't1', title: 'Write blog post about new features', status: 'completed', progress: 100 },
          { id: 't2', title: 'Create product demo video', status: 'in_progress', progress: 60 },
          { id: 't3', title: 'Design infographic for social media', status: 'todo', progress: 0 },
        ],
      },
      {
        id: '1-2',
        name: 'Social Media Strategy',
        progress: 65,
        tasks: [
          { id: 't4', title: 'Plan Q4 content calendar', status: 'completed', progress: 100 },
          { id: 't5', title: 'Schedule Instagram posts', status: 'in_progress', progress: 70 },
        ],
      },
    ],
  },
];

export default function TodayPage() {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['1']));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['1-1']));

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  // 전체 통계 계산
  const totalTasks = mockProjects.reduce(
    (sum, project) => sum + project.taskGroups.reduce((s, g) => s + g.tasks.length, 0),
    0
  );
  const inProgress = mockProjects.reduce(
    (sum, project) => sum + project.taskGroups.reduce((s, g) => s + g.tasks.filter(t => t.status === 'in_progress').length, 0),
    0
  );
  const completed = mockProjects.reduce(
    (sum, project) => sum + project.taskGroups.reduce((s, g) => s + g.tasks.filter(t => t.status === 'completed').length, 0),
    0
  );
  const todo = totalTasks - inProgress - completed;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            2025년 11월 26일 수요일
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">{totalTasks}개의 할 일</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 오늘의 진행상황 */}
          <div className="bg-blue-50 rounded-lg border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">오늘의 진행상황</h3>
                <p className="text-sm text-gray-600 mt-1">{completed}/{totalTasks} 작업 완료</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">27%</span>
            </div>
            <ProgressBar progress={27} size="lg" showLabel={false} />
            
            {/* 상태별 통계 */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{totalTasks}</div>
                <div className="text-xs text-gray-600 mt-1">전체</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{inProgress}</div>
                <div className="text-xs text-gray-600 mt-1">진행 중</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-600">{todo}</div>
                <div className="text-xs text-gray-600 mt-1">시작전</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{completed}</div>
                <div className="text-xs text-gray-600 mt-1">완료</div>
              </div>
            </div>
          </div>

          {/* 프로젝트 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">프로젝트별 현황</h2>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                <Plus className="w-4 h-4" />
                새 프로젝트
              </button>
            </div>

            {mockProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* 프로젝트 헤더 */}
                <button
                  onClick={() => toggleProject(project.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {project.taskGroups.reduce((sum, g) => sum + g.tasks.filter(t => t.status === 'completed').length, 0)}/
                      {project.taskGroups.reduce((sum, g) => sum + g.tasks.length, 0)} 작업 완료
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-gray-900">{project.progress}%</span>
                  </div>
                </button>

                {/* 프로젝트 진행률 */}
                {expandedProjects.has(project.id) && (
                  <div className="px-4 pb-4">
                    <ProgressBar progress={project.progress} color={project.color} showLabel={false} />
                  </div>
                )}

                {/* 작업 그룹 */}
                {expandedProjects.has(project.id) && (
                  <div className="border-t border-gray-200">
                    {project.taskGroups.map((group) => (
                      <div key={group.id} className="border-b border-gray-100 last:border-0">
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center gap-3 p-4 pl-12 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-shrink-0">
                            {expandedGroups.has(group.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-sm font-medium text-gray-900">{group.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                작업 진행률
                              </span>
                              <div className="flex-1 max-w-xs">
                                <ProgressBar progress={group.progress} color={project.color} size="sm" showLabel={false} />
                              </div>
                              <span className="text-xs font-medium text-gray-600">{group.progress}%</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {group.tasks.length}개
                          </span>
                          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                            <Plus className="w-4 h-4 text-gray-500" />
                          </button>
                        </button>

                        {/* 작업 목록 */}
                        {expandedGroups.has(group.id) && (
                          <div className="px-4 pb-4 pl-20 space-y-2">
                            {group.tasks.map((task) => (
                              <div
                                key={task.id}
                                className={`
                                  p-3 rounded-lg border transition-colors
                                  ${task.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}
                                `}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={task.status === 'completed'}
                                    className="mt-0.5"
                                    readOnly
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {task.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <div className="flex-1 max-w-sm">
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-3 h-3 text-gray-400" />
                                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                              }`}
                                              style={{ width: `${task.progress}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium text-gray-600">
                                            {task.progress}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                          미루기
                                        </button>
                                        <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                          내일로
                                        </button>
                                        <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                          보류
                                        </button>
                                        <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                          삭제
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <button className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0">
                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
