import styles from "./DonutChart.module.css";

interface DonutChartProps {
  progress: number; // 0-100
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
  showLabel?: boolean;
}

export default function DonutChart({
  progress,
  size = "md",
  color = "#3b82f6",
  showLabel = true,
}: DonutChartProps) {
  // 진행률을 0-100 범위로 제한
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // 원의 둘레 계산 (반지름 45 기준)
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  // 진행률에 따른 stroke-dashoffset 계산
  const offset = circumference - (clampedProgress / 100) * circumference;

  // 크기별 설정
  const sizeConfig = {
    xs: { width: 24, height: 24, strokeWidth: 8, fontSize: "0.625rem" },
    sm: { width: 60, height: 60, strokeWidth: 8, fontSize: "0.75rem" },
    md: { width: 80, height: 80, strokeWidth: 8, fontSize: "0.875rem" },
    lg: { width: 100, height: 100, strokeWidth: 10, fontSize: "1rem" },
  };

  const config = sizeConfig[size];

  return (
    <div className={styles.container} style={{ width: config.width, height: config.height }}>
      <svg
        className={styles.svg}
        width={config.width}
        height={config.height}
        viewBox="0 0 100 100"
      >
        {/* 배경 원 */}
        <circle
          className={styles.bgCircle}
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={config.strokeWidth}
        />

        {/* 진행률 원 */}
        <circle
          className={styles.progressCircle}
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={config.strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>

      {showLabel && (
        <div className={styles.label} style={{ fontSize: config.fontSize }}>
          <span className={styles.percentage}>{clampedProgress}</span>
          <span className={styles.unit}>%</span>
        </div>
      )}
    </div>
  );
}
