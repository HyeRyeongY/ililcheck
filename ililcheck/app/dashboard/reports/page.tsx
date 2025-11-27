import Header from '@/components/layout/Header';
import ProgressBar from '@/components/ui/ProgressBar';

export default function ReportsPage() {
  const reportData = {
    completionRate: 27,
    date: '2025년 11월 26일 수요일',
    tasksCompleted: 3,
    totalTasks: 11,
    stats: {
      inProgress: 6,
      scheduled: 2,
      overdue: 0,
      completed: 3,
    },
    projects: [
      {
        id: '1',
        name: 'Q4 Marketing Campaign',
        progress: 40,
        tasksCompleted: 2,
        totalTasks: 5,
        color: '#3b82f6',
      },
      {
        id: '2',
        name: 'Website Redesign',
        progress: 0,
        tasksCompleted: 0,
        totalTasks: 2,
        color: '#8b5cf6',
      },
      {
        id: '3',
        name: 'Mobile App Development',
        progress: 0,
        tasksCompleted: 0,
        totalTasks: 1,
        color: '#ef4444',
      },
    ],
  };

  return (
    <div className="h-full flex flex-col">
      <Header title="업무 보고서" dateRange showExport />
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 보고서 헤더 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">업무 보고서</h2>
            <p className="text-sm text-gray-500">{reportData.date}</p>
          </div>

          {/* 완료율 섹션 */}
          <div className="bg-blue-50 rounded-lg border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">완료율</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {reportData.tasksCompleted}/{reportData.totalTasks} 작업 완료
                </p>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {reportData.completionRate}%
              </span>
            </div>
            <ProgressBar progress={reportData.completionRate} size="lg" showLabel={false} />
          </div>

          {/* 상태별 통계 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reportData.stats.inProgress}
              </div>
              <div className="text-sm text-gray-600 mt-1">진행 중</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {reportData.stats.scheduled}
              </div>
              <div className="text-sm text-gray-600 mt-1">시작전</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reportData.stats.overdue}
              </div>
              <div className="text-sm text-gray-600 mt-1">보류</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportData.stats.completed}
              </div>
              <div className="text-sm text-gray-600 mt-1">완료</div>
            </div>
          </div>

          {/* 프로젝트별 현황 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              프로젝트◆◆◆ 현황
            </h3>
            <div className="space-y-4">
              {reportData.projects.map((project) => (
                <div key={project.id} className="border-l-4 pl-4" style={{ borderColor: project.color }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{project.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {project.tasksCompleted}/{project.totalTasks} 작업 완료
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                  </div>
                  <ProgressBar progress={project.progress} color={project.color} showLabel={false} />
                </div>
              ))}
            </div>
          </div>

          {/* 메모 섹션 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">메모</h3>
            <textarea
              placeholder="보고서에 추가할 메모를 입력하세요..."
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={6}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                취소
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors">
                <span className="flex items-center gap-2">
                  저장
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
