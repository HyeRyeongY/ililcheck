'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';
import { getUserRole } from '@/lib/admin';
import { useRouter } from 'next/navigation';

export default function DirectUpdatePage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const role = await getUserRole(user.uid);
      if (role !== 'master') {
        setMessage('❌ Master 권한이 필요합니다.');
        setChecking(false);
        return;
      }

      setAuthorized(true);
      setChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdate = async () => {
    setLoading(true);
    setMessage('업데이트 중...');

    try {
      const email = 'yoonhr7@gmail.com';
      const userId = 'yoonhr';
      const username = 'yoonhr';

      // 이메일로 사용자 찾기
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage('❌ 해당 이메일의 사용자를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      // 첫 번째 일치하는 사용자 업데이트
      const userDoc = snapshot.docs[0];
      const userRef = doc(db, 'users', userDoc.id);

      await updateDoc(userRef, {
        userId: userId,
        username: username,
      });

      setMessage(`✅ 성공! ${email} 계정에 userId="${userId}", username="${username}"을 설정했습니다.`);
    } catch (error: any) {
      console.error('업데이트 실패:', error);
      setMessage(`❌ 실패: ${error.message}`);
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <p>권한 확인 중...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>접근 권한 없음</h1>
        <p style={{ color: 'red' }}>{message}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>사용자 정보 직접 업데이트</h1>
      <p>yoonhr7@gmail.com 계정에 userId와 username을 설정합니다.</p>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <p><strong>이메일:</strong> yoonhr7@gmail.com</p>
          <p><strong>userId:</strong> yoonhr</p>
          <p><strong>username:</strong> yoonhr</p>
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
          }}
        >
          {loading ? '처리 중...' : '업데이트 실행'}
        </button>

        {message && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: message.startsWith('✅') ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${message.startsWith('✅') ? '#10b981' : '#ef4444'}`,
              borderRadius: '4px',
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => router.push('/admin')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          관리자 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}
