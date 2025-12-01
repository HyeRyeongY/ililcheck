'use client';

import {
  checkAdminStatus,
  fetchAllUsers,
  getUserRole,
  grantManagerRole,
  revokeAdminRole,
  type UserRole
} from '@/lib/admin';
import { onAuthChange } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface UserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  lastLoginAt: string;
  provider: string;
  role?: UserRole;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('user');

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // 현재 사용자의 역할 확인
      const role = await getUserRole(user.uid);
      setCurrentUserRole(role);

      // 관리자 권한 확인
      const adminStatus = await checkAdminStatus(user.uid);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        alert('관리자 권한이 없습니다.');
        router.push('/dashboard/today');
        return;
      }

      // 모든 사용자 정보 가져오기
      const allUsers = await fetchAllUsers();

      // 각 사용자의 역할 확인
      const usersWithRoles = await Promise.all(
        allUsers.map(async (user) => ({
          ...user,
          role: await getUserRole(user.uid),
        }))
      );

      setUsers(usersWithRoles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleToggleRole = async (uid: string, currentRole: UserRole) => {
    const user = users.find(u => u.uid === uid);
    if (!user) return;

    // Master만 권한 변경 가능
    if (currentUserRole !== 'master') {
      alert('Master만 권한을 변경할 수 있습니다.');
      return;
    }

    const action = currentRole === 'manager' ? 'Manager 권한 제거' : 'Manager 권한 부여';
    const confirmed = window.confirm(
      `${user.email || '사용자'}의 ${action}를 하시겠습니까?`
    );

    if (!confirmed) return;

    const success = currentRole === 'manager'
      ? await revokeAdminRole(uid)
      : await grantManagerRole(uid);

    if (success) {
      // 사용자 목록 업데이트
      const newRole: UserRole = currentRole === 'manager' ? 'user' : 'manager';
      setUsers(users.map(u =>
        u.uid === uid ? { ...u, role: newRole } : u
      ));
      alert(`${action}가 완료되었습니다.`);
    } else {
      alert(`${action}에 실패했습니다.`);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>관리자 페이지</h1>
        <p className={styles.subtitle}>가입된 사용자 정보</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statLabel}>총 사용자</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {users.filter(u => u.provider === 'google.com').length}
          </div>
          <div className={styles.statLabel}>Google 계정</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {users.filter(u => u.provider === 'password').length}
          </div>
          <div className={styles.statLabel}>이메일 계정</div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>UID</th>
              <th>이메일</th>
              <th>이름</th>
              <th>가입 방법</th>
              <th>가입일</th>
              <th>마지막 로그인</th>
              <th>권한</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.uid === currentUser?.uid;
              const userRole = user.role || 'user';

              return (
                <tr key={user.uid}>
                  <td className={styles.uid}>{user.uid}</td>
                  <td>{user.email || '-'}</td>
                  <td>{user.displayName || '-'}</td>
                  <td>
                    <span className={styles.badge}>
                      {user.provider === 'google.com' ? 'Google' : '이메일'}
                    </span>
                  </td>
                  <td>{user.createdAt}</td>
                  <td>{user.lastLoginAt}</td>
                  <td>
                    {userRole === 'master' ? (
                      <span className={styles.badgeMaster}>Master</span>
                    ) : userRole === 'manager' ? (
                      <span className={styles.badgeManager}>Manager</span>
                    ) : (
                      <span className={styles.badgeUser}>User</span>
                    )}
                  </td>
                  <td>
                    {currentUserRole === 'master' && !isSelf && userRole !== 'master' ? (
                      <button
                        onClick={() => handleToggleRole(user.uid, userRole)}
                        className={
                          userRole === 'manager' ? styles.btnRevoke : styles.btnGrant
                        }
                      >
                        {userRole === 'manager' ? '권한 제거' : 'Manager 지정'}
                      </button>
                    ) : (
                      <span className={styles.noAction}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className={styles.empty}>
          아직 가입된 사용자가 없습니다.
        </div>
      )}
    </div>
  );
}
