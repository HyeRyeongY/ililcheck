"use client";

import { useState } from "react";
import { Calendar, ChevronRight, MoreVertical, Trash2, RotateCcw } from "lucide-react";
import { Task } from "@/lib/types";
import styles from "./TaskItem.module.css";

interface TaskItemProps {
    task: Task;
    onStatusChange: (taskId: string, status: Task["status"]) => void;
    onDelete: (taskId: string) => void;
    onProgressChange?: (taskId: string, progress: number) => void;
}

export default function TaskItem({ task, onStatusChange, onDelete, onProgressChange }: TaskItemProps) {
    const isCompleted = task.status === "completed";
    const isOnHold = task.status === "on_hold";

    const getStatusIcon = () => {
        switch (task.status) {
            case "completed":
                return "✓";
            case "in_progress":
                return "○";
            case "on_hold":
                return "▮";
            default:
                return "○";
        }
    };

    const getContainerClass = () => {
        if (task.status === "completed") return styles.completed;
        if (task.status === "in_progress") return styles.inProgress;
        if (task.status === "on_hold") return styles.onHold;
        return "";
    };

    const handleProgressClick = (percentage: number) => {
        if (onProgressChange) {
            onProgressChange(task.id, percentage);
        }
    };

    const handleReset = () => {
        if (onProgressChange) {
            onProgressChange(task.id, 0);
        }
    };

    // 5%씩 증가하는 진행률 블록 (20개 = 5% ~ 100%)
    const progressBlocks = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

    return (
        <div className={`${styles.container} ${getContainerClass()}`}>
            <div className={styles.content}>
                <button
                    onClick={() => {
                        const nextStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "completed" : "todo";
                        onStatusChange(task.id, nextStatus);
                    }}
                    className={styles.statusButton}
                >
                    {getStatusIcon()}
                </button>

                <div className={styles.taskContent}>
                    <div className={styles.titleContainer}>
                        <p className={`${styles.title} ${isCompleted ? styles.completed : ""}`}>{task.title}</p>
                        <div className={styles.dateInfo}>
                            <span className={styles.dateLabel}>
                                시작: {task.startDate ? new Date(task.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                            </span>
                            <span className={styles.dateLabel}>
                                완료: {task.completedDate ? new Date(task.completedDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                            </span>
                        </div>
                    </div>

                    {/* 진행률 블록 (이미지 참고 디자인) */}
                    <div className={styles.progressSection}>
                        <div className={styles.progressBlocksContainer}>
                            {/* 리셋 버튼 */}
                            <button onClick={handleReset} className={styles.resetButton} title="진행률 초기화 (0%)">
                                <RotateCcw className={styles.resetIcon} />
                            </button>

                            {/* 진행률 블록들 */}
                            <div className={styles.progressBlocks}>
                                {progressBlocks.map((percentage) => (
                                    <button key={percentage} className={`${styles.progressBlock} ${task.progress >= percentage ? styles.progressBlockFilled : ""}`} onClick={() => handleProgressClick(percentage)} title={`${percentage}%`} />
                                ))}
                            </div>

                            {/* 진행률 퍼센트 표시 */}
                            <span className={styles.progressPercent}>{task.progress}%</span>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className={styles.actions}>
                        {task.dueDate && (
                            <button className={styles.actionButton}>
                                <Calendar className={styles.actionIcon} />
                                미루기
                            </button>
                        )}
                        <button className={styles.actionButton}>
                            <ChevronRight className={styles.actionIcon} />
                            내일로
                        </button>
                        <button onClick={() => onStatusChange(task.id, "on_hold")} className={`${styles.actionButton} ${isOnHold ? styles.onHold : ""}`}>
                            <MoreVertical className={styles.actionIcon} />
                            보류
                        </button>
                        <button onClick={() => onDelete(task.id)} className={`${styles.actionButton} ${styles.delete}`}>
                            <Trash2 className={styles.actionIcon} />
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
