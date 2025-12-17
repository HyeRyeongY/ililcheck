import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import app, { db } from './firebase';
import { saveUserInfo } from './admin';

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * userId를 Firebase 이메일 형식으로 변환
 * Firebase는 이메일만 지원하므로 userId@ililcheck.internal 형식으로 저장
 */
function userIdToEmail(userId: string): string {
  return `${userId}@ililcheck.internal`;
}

/**
 * 아이디/비밀번호로 회원가입
 */
export async function signUpWithEmail(userId: string, email: string, password: string, username: string) {
  try {
    // userId를 Firebase 이메일 형식으로 변환
    const firebaseEmail = userIdToEmail(userId);

    const userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, password);
    const user = userCredential.user;

    // Firebase Auth 프로필에 username 설정
    await updateProfile(user, {
      displayName: username,
    });

    // 사용자 정보 저장
    await saveUserInfo(user.uid, email || null, username, 'password', userId, username);

    return { user, error: null };
  } catch (error: any) {
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = '이미 사용 중인 아이디입니다.';
    }
    return { user: null, error: errorMessage };
  }
}

/**
 * 아이디/비밀번호로 로그인
 */
export async function signInWithEmail(userId: string, password: string) {
  try {
    let userCredential;
    let actualEmail = '';

    // 1. @가 포함되어 있으면 이메일로 직접 로그인
    if (userId.includes('@')) {
      console.log('이메일로 로그인 시도:', userId);
      userCredential = await signInWithEmailAndPassword(auth, userId, password);
      actualEmail = userId;
    } else {
      // 2. @가 없으면 userId@ililcheck.internal 형식으로 로그인
      actualEmail = userIdToEmail(userId);
      console.log('Firebase Auth 로그인 시도:', actualEmail);
      userCredential = await signInWithEmailAndPassword(auth, actualEmail, password);
    }

    const user = userCredential.user;

    // 사용자 정보 업데이트 (마지막 로그인 시간)
    await saveUserInfo(user.uid, user.email, user.displayName, 'password', userId);

    return { user, error: null };
  } catch (error: any) {
    console.error('로그인 실패:', error.code, error.message);
    let errorMessage = error.message;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    return { user: null, error: errorMessage };
  }
}

/**
 * Google 로그인
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // 사용자 정보 저장/업데이트
    await saveUserInfo(user.uid, user.email, user.displayName, 'google.com');

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

/**
 * 로그아웃
 */
export async function logout() {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 인증 상태 변경 리스너
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
