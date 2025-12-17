'use client';

import { setUserIdAndUsername } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SetupUsernamePage() {
  const router = useRouter();
  const [email, setEmail] = useState('yoonhr7@gmail.com');
  const [userId, setUserIdInput] = useState('yoonhr');
  const [username, setUsernameInput] = useState('yoonhr');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setMessage('');

    const { success, error } = await setUserIdAndUsername(email, userId, username);

    setLoading(false);

    if (success) {
      setMessage(`✅ 성공: ${email} 계정에 userId "${userId}", username "${username}"을(를) 설정했습니다.`);
    } else {
      setMessage(`❌ 실패: ${error}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>UserId & Username 설정</h1>
      <p>기존 계정에 userId와 username을 추가합니다.</p>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            UserId (로그인용 아이디)
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserIdInput(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Username (화면 표시용 이름)
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsernameInput(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <button
          onClick={handleSetup}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
          }}
        >
          {loading ? '처리 중...' : 'UserId & Username 설정'}
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
          onClick={() => router.push('/dashboard/today')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
}
