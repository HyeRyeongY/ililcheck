import { cn } from '@/lib/utils';

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
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-2">
        <div className={cn('flex-1 bg-gray-200 rounded-full overflow-hidden', heightClasses[size])}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              backgroundColor: color,
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}
