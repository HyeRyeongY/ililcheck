'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';

// 임시 작업 데이터
const mockTasks = [
  { id: '1', date: new Date(2025, 10, 22), count: 1, status: 'completed' },
  { id: '2', date: new Date(2025, 10, 25), count: 2, status: 'in_progress' },
  { id: '3', date: new Date(2025, 10, 27), count: 3, status: 'in_progress' },
  { id: '4', date: new Date(2025, 10, 28), count: 1, status: 'in_progress' },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const getTasksForDate = (date: Date) => {
    return mockTasks.filter(task => isSameDay(task.date, date));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">달력</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex gap-6">
          {/* 달력 */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
            {/* 달력 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                >
                  오늘
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'yyyy년 MM월', { locale: ko })}
              </h2>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium py-2 ${
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {days.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const tasks = getTasksForDate(day);
                const dayOfWeek = day.getDay();

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      bg-white p-2 text-left hover:bg-gray-50 transition-colors relative min-h-[100px]
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                    `}
                  >
                    <span
                      className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                        ${isToday ? 'bg-blue-500 text-white' : ''}
                        ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-900'}
                        ${!isCurrentMonth && !isToday ? 'text-gray-400' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    
                    {/* 작업 점 표시 */}
                    {tasks.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
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
          <div className="w-96 bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {format(selectedDate, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
              </h2>
              <p className="text-sm text-gray-500">
                {format(selectedDate, 'M')}개의 할 일
              </p>
            </div>

            {/* 전체 진행률 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">전체 진행률</span>
                <span className="text-lg font-bold text-blue-600">52%</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '52%' }} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-gray-600">진행 중 (6)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-gray-600">완료 (3)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-gray-600">보류 (0)</span>
                </div>
              </div>
            </div>

            {/* 프로젝트 목록 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">프로젝트</h3>
              
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Q4 Marketing Campaign</h4>
                    <button className="text-blue-500 text-xs hover:text-blue-600">+ 추가</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5" />
                      <span className="flex-1 text-gray-700">Content Creation</span>
                      <span className="text-xs text-gray-500">3개</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
