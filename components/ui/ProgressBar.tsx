import { cn } from '@/lib/utils';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  progress: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({
  progress,
  color,
  className,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const sizeClasses = {
    sm: styles.barSm,
    md: styles.barMd,
    lg: styles.barLg,
  };

  // 진행률에 따른 색상 결정 (color prop이 없을 때만)
  const getProgressColor = () => {
    if (color) return color; // color prop이 있으면 우선 사용

    if (progress >= 100) return '#3b82f6'; // 완료 (파란색)
    if (progress >= 70) return '#22c55e'; // 높은 진행률 (녹색)
    if (progress >= 40) return '#f59e0b'; // 중간 진행률 (주황색)
    return '#ef4444'; // 낮은 진행률 (빨간색)
  };

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.wrapper}>
        <div className={cn(styles.barContainer, sizeClasses[size])}>
          <div
            className={styles.bar}
            style={{
              backgroundColor: getProgressColor(),
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
        {showLabel && (
          <span className={styles.percentageText}>
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}
