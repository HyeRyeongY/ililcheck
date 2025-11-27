'use client';

import { Download, FileDown } from 'lucide-react';

interface HeaderProps {
  title: string;
  dateRange?: boolean;
  showExport?: boolean;
}

export default function Header({ title, dateRange, showExport = false }: HeaderProps) {
  const handleExportJPG = () => {
    // TODO: JPG 내보내기 구현
    console.log('Export as JPG');
  };

  const handleExportPDF = () => {
    // TODO: PDF 내보내기 구현
    console.log('Export as PDF');
  };

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            <FileDown className="inline-block w-5 h-5 mr-2 text-blue-500" />
            {title}
          </h1>
          {dateRange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">기간 선택:</span>
              <input
                type="text"
                placeholder="시작일"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400">~</span>
              <input
                type="text"
                placeholder="종료일"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
        
        {showExport && (
          <div className="flex gap-2">
            <button
              onClick={handleExportJPG}
              className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              JPG 내보내기
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              PDF 내보내기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
