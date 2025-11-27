'use client';

import { List, Clock, CheckCircle, PauseCircle } from 'lucide-react';
import { TaskFilterType, TaskStats } from '@/lib/types';
import styles from './FilterButtons.module.css';

interface FilterButtonsProps {
  activeFilter: TaskFilterType;
  onFilterChange: (filter: TaskFilterType) => void;
  stats: TaskStats;
}

const filters = [
  { id: 'all' as TaskFilterType, label: '전체', icon: List, getCount: (stats: TaskStats) => stats.total },
  { id: 'in_progress' as TaskFilterType, label: '진행 중', icon: Clock, getCount: (stats: TaskStats) => stats.inProgress },
  { id: 'completed' as TaskFilterType, label: '완료', icon: CheckCircle, getCount: (stats: TaskStats) => stats.completed },
  { id: 'on_hold' as TaskFilterType, label: '보류', icon: PauseCircle, getCount: (stats: TaskStats) => stats.onHold },
];

export default function FilterButtons({
  activeFilter,
  onFilterChange,
  stats,
}: FilterButtonsProps) {
  return (
    <div className={styles.container}>
      {filters.map((filter) => {
        const Icon = filter.icon;
        const count = filter.getCount(stats);
        const isActive = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`${styles.filterButton} ${isActive ? styles.active : ''}`}
          >
            <Icon className={styles.icon} />
            <span className={styles.label}>{filter.label}</span>
            <span className={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
