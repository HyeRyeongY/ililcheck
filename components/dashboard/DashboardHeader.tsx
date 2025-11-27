'use client';

import { Calendar } from 'lucide-react';
import { TaskStats } from '@/lib/types';
import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  currentDate: string;
  workWeek: string;
  stats: TaskStats;
}

export default function DashboardHeader({
  currentDate,
  workWeek,
  stats,
}: DashboardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.dateContainer}>
        <Calendar className={styles.calendarIcon} />
        <span className={styles.dateText}>{currentDate}</span>
      </div>
      <p className={styles.workWeek}>{workWeek}</p>
    </div>
  );
}
