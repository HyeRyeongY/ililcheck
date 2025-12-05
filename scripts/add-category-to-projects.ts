/**
 * 기존 프로젝트에 category 필드를 추가하는 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/add-category-to-projects.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Firebase Admin 초기화
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);

  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (error) {
  console.error('Firebase Admin 초기화 실패. serviceAccountKey.json 파일을 확인하세요.');
  process.exit(1);
}

const db = getFirestore();

async function addCategoryToProjects() {
  try {
    console.log('프로젝트에 category 필드를 추가합니다...');

    const projectsSnapshot = await db.collection('projects').get();

    console.log(`총 ${projectsSnapshot.size}개의 프로젝트를 찾았습니다.`);

    let updated = 0;
    let skipped = 0;

    for (const doc of projectsSnapshot.docs) {
      const data = doc.data();

      // 이미 category 필드가 있으면 건너뛰기
      if (data.category) {
        console.log(`  [건너뜀] ${data.name} - 이미 category 필드가 있음 (${data.category})`);
        skipped++;
        continue;
      }

      // category 필드 추가 (기본값: 'personal')
      await doc.ref.update({
        category: 'personal'
      });

      console.log(`  [업데이트] ${data.name} - category: 'personal' 추가`);
      updated++;
    }

    console.log('\n완료!');
    console.log(`  업데이트: ${updated}개`);
    console.log(`  건너뜀: ${skipped}개`);

  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

addCategoryToProjects()
  .then(() => {
    console.log('\n스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
