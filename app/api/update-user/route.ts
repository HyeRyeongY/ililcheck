// /src/app/api/update-user/route.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

function getAdminDb() {
  if (!getApps().length) {
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY
    ) {
      throw new Error("Firebase Admin ENV missing");
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getFirestore();
}

export async function POST(request: NextRequest) {
  try {
    const { email, userId, username } = await request.json();

    if (!email || !userId || !username) {
      return NextResponse.json(
        { success: false, error: "email, userId, username이 필요합니다." },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "해당 이메일의 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({ userId, username });

    return NextResponse.json({
      success: true,
      uid: userDoc.id,
    });
  } catch (error: any) {
    console.error("사용자 업데이트 실패:", error);

    return NextResponse.json(
      { success: false, error: error.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
