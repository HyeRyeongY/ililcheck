/**
 * 이 스크립트를 브라우저 콘솔에서 실행하여 기존 사용자의 userId와 username을 설정합니다.
 *
 * 사용방법:
 * 1. 브라우저에서 앱에 로그인
 * 2. 개발자 도구 콘솔을 열기 (F12)
 * 3. 이 함수를 복사해서 콘솔에 붙여넣기
 * 4. updateUserIdByEmail('yoonhr7@gmail.com', 'yoonhr', 'yoonhr') 실행
 */

import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function updateUserIdByEmail(email: string, userId: string, username: string) {
  try {
    console.log(`사용자 정보 업데이트 시작: ${email}`);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error('해당 이메일의 사용자를 찾을 수 없습니다.');
      return { success: false, error: '사용자를 찾을 수 없습니다.' };
    }

    const userDoc = snapshot.docs[0];
    const userRef = doc(db, 'users', userDoc.id);

    await updateDoc(userRef, {
      userId: userId,
      username: username,
    });

    console.log('✅ 사용자 정보 업데이트 완료!');
    console.log(`- UID: ${userDoc.id}`);
    console.log(`- Email: ${email}`);
    console.log(`- UserId: ${userId}`);
    console.log(`- Username: ${username}`);

    return { success: true };
  } catch (error: any) {
    console.error('❌ 업데이트 실패:', error);
    return { success: false, error: error.message };
  }
}
