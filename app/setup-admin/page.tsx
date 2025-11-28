'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthChange } from '@/lib/auth';
import { grantAdminAccess, checkAdminStatus } from '@/lib/admin';
import styles from './page.module.css';

export default function SetupAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // 현재 관리자 권한 확인
      const adminStatus = await checkAdminStatus(user.uid);
      setIsAdmin(adminStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleGrantAdmin = async () => {
    if (!currentUser) {
      setMessage('로그인된 사용자가 없습니다.');
      return;
    }

    setGranting(true);
    setMessage('');

    const success = await grantAdminAccess(currentUser.uid);

    if (success) {
      setMessage('✅ 관리자 권한이 부여되었습니다!');
      setIsAdmin(true);

      // 3초 후 관리자 페이지로 이동
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } else {
      setMessage('❌ 관리자 권한 부여에 실패했습니다.');
    }

    setGranting(false);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>관리자 권한 설정</h1>
        <p className={styles.subtitle}>현재 로그인된 계정을 관리자로 설정합니다</p>

        <div className={styles.userInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>이메일:</span>
            <span className={styles.value}>{currentUser?.email || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>UID:</span>
            <span className={styles.valueSmall}>{currentUser?.uid || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>현재 상태:</span>
            <span className={isAdmin ? styles.statusAdmin : styles.statusNormal}>
              {isAdmin ? '✓ 관리자' : '일반 사용자'}
            </span>
          </div>
        </div>

        {message && (
          <div className={message.includes('✅') ? styles.success : styles.error}>
            {message}
          </div>
        )}

        {!isAdmin && (
          <button
            onClick={handleGrantAdmin}
            className={styles.button}
            disabled={granting}
          >
            {granting ? '권한 부여 중...' : '관리자 권한 부여'}
          </button>
        )}

        {isAdmin && (
          <div className={styles.actions}>
            <button
              onClick={() => router.push('/admin')}
              className={styles.buttonPrimary}
            >
              관리자 페이지로 이동
            </button>
            <button
              onClick={() => router.push('/dashboard/today')}
              className={styles.buttonSecondary}
            >
              대시보드로 이동
            </button>
          </div>
        )}

        <div className={styles.warning}>
          ⚠️ 이 페이지는 개발/테스트 용도입니다. 프로덕션 환경에서는 제거하세요.
        </div>
      </div>
    </div>
  );
}
