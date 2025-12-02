'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createProject } from '@/lib/api';
import type { Project, ProjectCategory } from '@/lib/types';
import styles from './CreateProjectModal.module.css';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProject: Project) => void;
  defaultCategory?: ProjectCategory;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
];

export default function CreateProjectModal({ isOpen, onClose, onSuccess, defaultCategory = 'personal' }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    color: PRESET_COLORS[0],
    category: defaultCategory as ProjectCategory
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, category: defaultCategory }));
    }
  }, [isOpen, defaultCategory]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('프로젝트 이름을 입력해주세요.');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('시작일과 종료일을 선택해주세요.');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const today = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const projectData: Omit<Project, 'id'> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        startDate: formData.startDate,
        endDate: formData.endDate,
        progress: 0,
        daysRemaining: Math.max(0, daysRemaining),
        category: formData.category
      };

      const newProject = await createProject(projectData);

      if (newProject) {
        onSuccess(newProject);
        handleClose();
      } else {
        setError('프로젝트 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('프로젝트 생성 에러:', err);
      setError('프로젝트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      category: defaultCategory,
      endDate: '',
      color: PRESET_COLORS[0]
    });
    setError('');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>새 프로젝트 만들기</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              프로젝트 이름 *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.input}
              placeholder="프로젝트 이름을 입력하세요"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              설명
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="프로젝트 설명을 입력하세요"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className={styles.dateFields}>
            <div className={styles.field}>
              <label htmlFor="startDate" className={styles.label}>
                시작일 *
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="endDate" className={styles.label}>
                종료일 *
              </label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>프로젝트 색상</label>
            <div className={styles.colorPicker}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorOption} ${
                    formData.color === color ? styles.colorOptionSelected : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? '생성 중...' : '프로젝트 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
