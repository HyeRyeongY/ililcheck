import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './auth';

// 컬렉션 이름
const USERS_COLLECTION = 'users';
const ADMINS_COLLECTION = 'admins';

// 권한 레벨
export type UserRole = 'master' | 'manager' | 'user';

interface UserInfoDisplay {
  uid: string;
  userId: string;
  username: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  lastLoginAt: string;
  provider: string;
  role?: UserRole;
}

/**
 * 모든 사용자 정보 가져오기 (관리자 전용)
 */
export async function fetchAllUsers(): Promise<UserInfoDisplay[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const users: UserInfoDisplay[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        userId: data.userId || '-',
        username: data.username || '-',
        email: data.email || null,
        displayName: data.displayName || null,
        createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString('ko-KR') : '-',
        lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt.toDate()).toLocaleString('ko-KR') : '-',
        provider: data.provider || 'unknown',
      };
    });

    return users;
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 사용자 정보 저장/업데이트
 * 로그인 시 자동으로 호출되어 사용자 정보를 저장합니다
 */
export async function saveUserInfo(
  uid: string,
  email: string | null,
  displayName: string | null,
  provider: string,
  userId?: string,
  username?: string
): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);

    const now = new Date();

    if (userDoc.exists()) {
      // 기존 사용자 - lastLoginAt만 업데이트
      await setDoc(
        userRef,
        {
          lastLoginAt: now,
        },
        { merge: true }
      );
    } else {
      // 신규 사용자 - 전체 정보 저장
      await setDoc(userRef, {
        userId: userId || null,
        username: username || null,
        email,
        displayName,
        provider,
        createdAt: now,
        lastLoginAt: now,
      });
    }

    return true;
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
    return false;
  }
}

/**
 * 사용자의 역할 가져오기
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  try {
    // 사용자 정보 가져오기
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);

    // Master 계정 확인 (환경변수)
    if (userDoc.exists()) {
      const userEmail = userDoc.data()?.email;
      const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL;

      if (masterEmail && userEmail === masterEmail) {
        return 'master';
      }
    }

    // Firestore admins 컬렉션에서 역할 확인
    const adminRef = doc(db, ADMINS_COLLECTION, uid);
    const adminDoc = await getDoc(adminRef);

    if (adminDoc.exists()) {
      const role = adminDoc.data()?.role;
      if (role === 'manager') return 'manager';
    }

    return 'user';
  } catch (error) {
    console.error('사용자 역할 확인 실패:', error);
    return 'user';
  }
}

/**
 * 관리자 권한 확인 (Master 또는 Manager)
 */
export async function checkAdminStatus(uid: string): Promise<boolean> {
  const role = await getUserRole(uid);
  return role === 'master' || role === 'manager';
}

/**
 * Manager 권한 부여 (Master만 가능)
 */
export async function grantManagerRole(uid: string): Promise<boolean> {
  try {
    const adminRef = doc(db, ADMINS_COLLECTION, uid);
    await setDoc(adminRef, {
      role: 'manager',
      grantedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Manager 권한 부여 실패:', error);
    return false;
  }
}

/**
 * 권한 제거 (일반 사용자로 변경)
 */
export async function revokeAdminRole(uid: string): Promise<boolean> {
  try {
    const adminRef = doc(db, ADMINS_COLLECTION, uid);
    await setDoc(adminRef, {
      role: 'user',
      revokedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('권한 제거 실패:', error);
    return false;
  }
}

/**
 * 레거시 함수 호환성 유지
 */
export async function grantAdminAccess(uid: string): Promise<boolean> {
  return grantManagerRole(uid);
}

export async function revokeAdminAccess(uid: string): Promise<boolean> {
  return revokeAdminRole(uid);
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  return checkAdminStatus(uid);
}

/**
 * 사용자에게 userId와 username 추가/수정 (관리자 전용)
 */
export async function setUserIdAndUsername(
  email: string,
  userId: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 이메일로 사용자 찾기
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: '해당 이메일의 사용자를 찾을 수 없습니다.' };
    }

    // 첫 번째 일치하는 사용자 업데이트
    const userDoc = snapshot.docs[0];
    const userRef = doc(db, USERS_COLLECTION, userDoc.id);

    await setDoc(
      userRef,
      {
        userId: userId,
        username: username,
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('UserId/Username 설정 실패:', error);
    return { success: false, error: error.message || 'UserId/Username 설정 중 오류가 발생했습니다.' };
  }
}

/**
 * 사용자 계정 삭제 (Master만 가능)
 * Firestore의 사용자 데이터만 삭제 (Firebase Auth는 서버에서 처리 필요)
 */
export async function deleteUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 현재 사용자가 Master인지 확인
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const currentUserRole = await getUserRole(currentUser.uid);
    if (currentUserRole !== 'master') {
      return { success: false, error: 'Master 권한이 필요합니다.' };
    }

    // Master 계정 자신을 삭제하지 못하도록 방지
    if (uid === currentUser.uid) {
      return { success: false, error: 'Master 계정은 삭제할 수 없습니다.' };
    }

    // Firestore에서 사용자 관련 데이터 삭제
    const userRef = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userRef);

    // admins 컬렉션에서도 삭제
    const adminRef = doc(db, ADMINS_COLLECTION, uid);
    const adminDoc = await getDoc(adminRef);
    if (adminDoc.exists()) {
      await deleteDoc(adminRef);
    }

    // 사용자의 프로젝트, 작업, 할일 삭제
    const collections = ['projects', 'tasks', 'todos'];
    for (const collectionName of collections) {
      const q = query(
        collection(db, collectionName),
        where('userId', '==', uid)
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }

    return { success: true };
  } catch (error: any) {
    console.error('사용자 삭제 실패:', error);
    return { success: false, error: error.message || '삭제 중 오류가 발생했습니다.' };
  }
}
