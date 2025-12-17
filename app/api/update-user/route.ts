import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin 초기화 (한 번만)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminDb = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const { email, userId, username } = await request.json();

    if (!email || !userId || !username) {
      return NextResponse.json(
        { success: false, error: 'email, userId, username이 필요합니다.' },
        { status: 400 }
      );
    }

    // 이메일로 사용자 찾기
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: '해당 이메일의 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 첫 번째 일치하는 사용자 업데이트
    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
      userId: userId,
      username: username,
    });

    return NextResponse.json({
      success: true,
      message: `${email} 계정에 userId="${userId}", username="${username}"을 설정했습니다.`,
      uid: userDoc.id,
    });
  } catch (error: any) {
    console.error('사용자 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
