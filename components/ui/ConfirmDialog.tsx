"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "info" | "success" | "warning" | "error";
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  type = "info",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      } else if (event.key === "Escape" && cancelText) {
        event.preventDefault();
        onCancel();
      }
    };

    // 포커스를 확인 버튼으로 이동
    const confirmButton = document.querySelector(
      ".confirm-button"
    ) as HTMLButtonElement;
    if (confirmButton) {
      confirmButton.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={`${styles.dialog} ${styles[type]}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          <button
            onClick={onCancel}
            className={styles.closeButton}
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.actions}>
          {cancelText && (
            <button onClick={onCancel} className={styles.cancelButton}>
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`${styles.confirmButton} confirm-button`}
            autoFocus
          >
            {confirmText}
          </button>
        </div>

        <div className={styles.keyboardHint}>
          {cancelText && <span>Esc: {cancelText}</span>}
          <span>Enter: {confirmText}</span>
        </div>
      </div>
    </div>
  );
}
