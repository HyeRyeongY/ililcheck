'use client';

import { useState, useEffect } from 'react';
import { Download, FileDown } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  dateRange?: boolean;
  showExport?: boolean;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

export default function Header({ title, dateRange, showExport = false, onDateRangeChange }: HeaderProps) {
  // 오늘 날짜를 기본값으로 설정
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // 초기 날짜 범위를 부모 컴포넌트에 전달 (한 번만 실행)
  useEffect(() => {
    if (onDateRangeChange) {
      onDateRangeChange(today, today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportJPG = () => {
    // TODO: JPG 내보내기 구현
    console.log('Export as JPG');
  };

  const handleExportPDF = () => {
    // TODO: PDF 내보내기 구현
    console.log('Export as PDF');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h1 className={styles.title}>
            <FileDown className="inline-block w-5 h-5 mr-2 text-blue-500" />
            {title}
          </h1>
          {dateRange && (
            <div className={styles.dateRange}>
              <span className={styles.dateRangeLabel}>기간 선택:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (onDateRangeChange && endDate) {
                    onDateRangeChange(e.target.value, endDate);
                  }
                }}
                className={styles.dateInput}
              />
              <span className={styles.dateSeparator}>~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (onDateRangeChange && startDate) {
                    onDateRangeChange(startDate, e.target.value);
                  }
                }}
                className={styles.dateInput}
              />
            </div>
          )}
        </div>

        {showExport && (
          <div className={styles.exportButtons}>
            <button
              onClick={handleExportJPG}
              className={`${styles.exportButton} ${styles.exportButtonJpg}`}
            >
              <Download className="h-4 w-4" />
              JPG 내보내기
            </button>
            <button
              onClick={handleExportPDF}
              className={`${styles.exportButton} ${styles.exportButtonPdf}`}
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
