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
  color = '#3b82f6',
  className,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const sizeClasses = {
    sm: styles.barSm,
    md: styles.barMd,
    lg: styles.barLg,
  };

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.wrapper}>
        <div className={cn(styles.barContainer, sizeClasses[size])}>
          <div
            className={styles.bar}
            style={{
              backgroundColor: color,
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
        {showLabel && (
          <span className={styles.label}>
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}
