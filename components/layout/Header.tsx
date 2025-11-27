'use client';

import { Download, FileDown } from 'lucide-react';
import styles from './Header.module.css';

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
                type="text"
                placeholder="시작일"
                className={styles.dateInput}
              />
              <span className={styles.dateSeparator}>~</span>
              <input
                type="text"
                placeholder="종료일"
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
