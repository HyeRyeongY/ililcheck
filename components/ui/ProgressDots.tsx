"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import styles from "./ProgressDots.module.css";

interface ProgressDotsProps {
  progress: number; // 0-100
  onChange?: (progress: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showReset?: boolean; // 리셋 버튼 표시 여부
}

export default function ProgressDots({
  progress,
  onChange,
  disabled = false,
  size = "md",
  showReset = false,
}: ProgressDotsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 10% 단위로 11개의 버튼 (0%, 10%, 20%, ..., 90%, 100%)
  const progressValues = Array.from({ length: 11 }, (_, i) => i * 10);

  const handleButtonClick = (value: number) => {
    if (disabled || !onChange) return;
    onChange(value);
  };

  // 현재 진행률에 따른 전체 색상 결정
  const getCurrentProgressColor = () => {
    if (progress === 100) return 'blue'; // 완료 (파란색)
    if (progress > 40) return 'green'; // 높은 진행률 (녹색)
    if (progress > 0) return 'yellow'; // 시작됨 (노란색)
    return 'gray'; // 시작 안 함 (회색)
  };

  const currentColor = getCurrentProgressColor();

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.buttonsContainer}>
        {progressValues.map((value) => {
          const isSelected = progress === value;
          const isFilled = value <= progress;
          const colorClass = isFilled ? currentColor : 'gray';

          return (
            <button
              key={value}
              className={`${styles.progressButton} ${styles[colorClass]} ${
                isSelected ? styles.selected : ""
              } ${disabled ? styles.disabled : ""}`}
              onClick={() => handleButtonClick(value)}
              onMouseEnter={() => !disabled && setHoveredIndex(value)}
              onMouseLeave={() => setHoveredIndex(null)}
              disabled={disabled}
              title={`${value}%`}
              aria-label={`진행률 ${value}%로 설정`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
