'use client';

import { TaskStats } from '@/lib/types';
import styles from './ProgressVisualization.module.css';

interface ProgressVisualizationProps {
  stats: TaskStats;
}

export default function ProgressVisualization({ stats }: ProgressVisualizationProps) {
  const totalBlocks = 20;
  const completedBlocks = Math.round((stats.completed / stats.total) * totalBlocks);
  const inProgressBlocks = Math.round((stats.inProgress / stats.total) * totalBlocks);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>오늘의 진행상황</h2>
        <span className={styles.percentage}>
          {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
        </span>
      </div>

      {/* 진행률 바 */}
      <div className={styles.progressBarContainer}>
        {Array.from({ length: totalBlocks }).map((_, index) => {
          let blockClass = styles.empty;
          if (index < completedBlocks) {
            blockClass = styles.completed;
          } else if (index < completedBlocks + inProgressBlocks) {
            blockClass = styles.inProgress;
          }

          return (
            <div
              key={index}
              className={`${styles.progressBlock} ${blockClass}`}
            />
          );
        })}
      </div>

      {/* 통계 */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={`${styles.statValue} ${styles.total}`}>{stats.total}</div>
          <div className={styles.statLabel}>전체</div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statValue} ${styles.inProgress}`}>{stats.inProgress}</div>
          <div className={styles.statLabel}>진행 중</div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statValue} ${styles.completed}`}>{stats.completed}</div>
          <div className={styles.statLabel}>완료</div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statValue} ${styles.onHold}`}>{stats.onHold}</div>
          <div className={styles.statLabel}>보류</div>
        </div>
      </div>
    </div>
  );
}
