'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { updateProject, deleteProject } from '@/lib/api';
import type { Project, ProjectCategory } from '@/lib/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale/ko';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './EditProjectDrawer.module.css';

registerLocale('ko', ko);

interface EditProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess: () => void;
  onDelete: () => void;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
];

export default function EditProjectDrawer({ isOpen, onClose, project, onSuccess, onDelete }: EditProjectDrawerProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    color: PRESET_COLORS[0],
    category: 'personal' as ProjectCategory
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    type?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        color: project.color || PRESET_COLORS[0],
        category: (project.category || 'personal') as ProjectCategory
      });
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('프로젝트 이름을 입력해주세요.');
      return;
    }

    if (!formData.startDate) {
      setError('시작일을 선택해주세요.');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = formData.endDate ? new Date(formData.endDate) : null;

    if (endDate && endDate < startDate) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const success = await updateProject(project.id, formData);

      if (success) {
        setDialog({
          isOpen: true,
          title: '저장 완료',
          message: '프로젝트가 성공적으로 수정되었습니다.',
          type: 'success',
          onConfirm: () => {
            setDialog(prev => ({ ...prev, isOpen: false }));
            onSuccess();
            handleClose();
          },
        });
      } else {
        setError('프로젝트 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('프로젝트 수정 에러:', err);
      setError('프로젝트 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setDialog({
      isOpen: true,
      title: '프로젝트 삭제',
      message: '정말로 이 프로젝트를 삭제하시겠습니까?\n프로젝트와 관련된 모든 작업과 할일이 삭제됩니다.',
      type: 'error',
      onConfirm: performDelete,
    });
  };

  const performDelete = async () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
    setLoading(true);

    try {
      const success = await deleteProject(project.id);

      if (success) {
        setDialog({
          isOpen: true,
          title: '삭제 완료',
          message: '프로젝트가 성공적으로 삭제되었습니다.',
          type: 'success',
          onConfirm: () => {
            setDialog(prev => ({ ...prev, isOpen: false }));
            onDelete();
            handleClose();
          },
        });
      } else {
        setError('프로젝트 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('프로젝트 삭제 에러:', err);
      setError('프로젝트 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      color: PRESET_COLORS[0],
      category: 'personal'
    });
    setError('');
    onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={handleClose}>
        <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>프로젝트 수정</h2>
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
                <label className={styles.label}>
                  시작일 *
                </label>
                <DatePicker
                  selected={formData.startDate ? new Date(formData.startDate) : null}
                  onChange={(date) => {
                    const dateString = date
                      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                          .toISOString()
                          .split('T')[0]
                      : '';
                    setFormData({ ...formData, startDate: dateString });
                  }}
                  placeholderText="시작일 선택"
                  dateFormat="yyyy-MM-dd"
                  className={styles.input}
                  locale="ko"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  종료일
                </label>
                <DatePicker
                  selected={formData.endDate ? new Date(formData.endDate) : null}
                  onChange={(date) => {
                    const dateString = date
                      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                          .toISOString()
                          .split('T')[0]
                      : '';
                    setFormData({ ...formData, endDate: dateString });
                  }}
                  placeholderText="무기한"
                  dateFormat="yyyy-MM-dd"
                  className={styles.input}
                  locale="ko"
                  isClearable
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>카테고리</label>
              <div className={styles.categoryButtons}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: 'personal' })}
                  className={`${styles.categoryButton} ${
                    formData.category === 'personal' ? styles.categoryButtonSelected : ''
                  }`}
                  disabled={loading}
                >
                  개인
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: 'work' })}
                  className={`${styles.categoryButton} ${
                    formData.category === 'work' ? styles.categoryButtonSelected : ''
                  }`}
                  disabled={loading}
                >
                  업무
                </button>
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
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
              <div className={styles.actionButtons}>
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
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        confirmText={dialog.type === 'warning' || dialog.type === 'error' ? '네' : '확인'}
        cancelText={dialog.type === 'warning' || dialog.type === 'error' ? '아니오' : undefined}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
