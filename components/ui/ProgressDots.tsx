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
  showReset = true,
}: ProgressDotsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 5% 단위로 20개의 도트 (0%, 5%, 10%, ..., 95%, 100%)
  const totalDots = 20;
  const dotsArray = Array.from({ length: totalDots }, (_, i) => i * 5);

  const getFilledDots = () => {
    return Math.floor(progress / 5);
  };

  const handleDotClick = (index: number) => {
    if (disabled || !onChange) return;
    const newProgress = (index + 1) * 5;
    onChange(newProgress);
  };

  const handleReset = () => {
    if (disabled || !onChange) return;
    onChange(0);
  };

  const getPreviewProgress = () => {
    if (hoveredIndex !== null && !disabled) {
      return (hoveredIndex + 1) * 5;
    }
    return progress;
  };

  const filledDots = getFilledDots();
  const previewProgress = getPreviewProgress();
  const previewFilledDots = Math.floor(previewProgress / 5);

  // 진행률에 따른 색상 결정
  const getProgressColor = (currentProgress: number) => {
    if (currentProgress >= 100) return '#3b82f6'; // 완료 (파란색)
    if (currentProgress >= 70) return '#22c55e'; // 높은 진행률 (녹색)
    if (currentProgress >= 40) return '#f59e0b'; // 중간 진행률 (주황색)
    return '#ef4444'; // 낮은 진행률 (빨간색)
  };

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.dotsContainer}>
        {dotsArray.map((value, index) => {
          const isFilled = index < filledDots;
          const isPreviewFilled = index < previewFilledDots;
          const isHovered = hoveredIndex === index;

          return (
            <button
              key={value}
              className={`${styles.dot} ${isFilled ? styles.filled : ""} ${
                isPreviewFilled && hoveredIndex !== null ? styles.preview : ""
              } ${isHovered ? styles.hovered : ""} ${
                disabled ? styles.disabled : styles.interactive
              }`}
              style={
                isFilled
                  ? { backgroundColor: getProgressColor(progress) }
                  : undefined
              }
              onClick={() => handleDotClick(index)}
              onMouseEnter={() => !disabled && setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              disabled={disabled}
              title={`${(index + 1) * 5}%`}
              aria-label={`진행률 ${(index + 1) * 5}%로 설정`}
            />
          );
        })}
      </div>
      <div className={styles.percentageText}>
        {hoveredIndex !== null && !disabled ? previewProgress : progress}%
      </div>
      <button
        onClick={handleReset}
        className={styles.resetButton}
        title="진행률 0%로 리셋"
        aria-label="진행률 리셋"
        disabled={!showReset || disabled || progress == 0}
      >
        <RotateCcw className={styles.resetIcon} />
      </button>
    </div>
  );
}
