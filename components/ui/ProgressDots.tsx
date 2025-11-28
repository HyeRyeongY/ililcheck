"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
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

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <button
        onClick={handleReset}
        className={styles.resetButton}
        title="진행률 0%로 리셋"
        aria-label="진행률 리셋"
        disabled={!showReset || disabled || progress == 0}
      >
        <RotateCcw className={styles.resetIcon} />
      </button>
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
      <div className={styles.progressText}>
        {hoveredIndex !== null && !disabled ? previewProgress : progress}%
      </div>
    </div>
  );
}
