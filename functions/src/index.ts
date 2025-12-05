/**
 * Cloud Functions for Firebase
 *
 * 프로젝트 삭제 시 관련 데이터를 자동으로 삭제하는 트리거 함수
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

/**
 * 프로젝트 삭제 시 관련 데이터 자동 삭제
 */
export const onProjectDelete = functions.firestore
  .document('projects/{projectId}')
  .onDelete(async (snap, context) => {
    const projectId = context.params.projectId;
    console.log(`🗑️ 프로젝트 삭제 감지: ${projectId}`);

    const batch = db.batch();
    let deleteCount = 0;

    try {
      // 1. 관련 TaskGroups 삭제
      const taskGroupsSnapshot = await db
        .collection('taskGroups')
        .where('projectId', '==', projectId)
        .get();

      console.log(`  📂 삭제할 TaskGroups: ${taskGroupsSnapshot.size}개`);
      taskGroupsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      // 2. 관련 Tasks와 Todos 삭제
      const tasksSnapshot = await db
        .collection('tasks')
        .where('projectId', '==', projectId)
        .get();

      console.log(`  📋 삭제할 Tasks: ${tasksSnapshot.size}개`);

      for (const taskDoc of tasksSnapshot.docs) {
        // Task의 Todos 먼저 삭제
        const todosSnapshot = await db
          .collection('todos')
          .where('taskId', '==', taskDoc.id)
          .get();

        console.log(`    ✓ Task "${taskDoc.id}"의 Todos: ${todosSnapshot.size}개`);
        todosSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deleteCount++;
        });

        // Task 삭제
        batch.delete(taskDoc.ref);
        deleteCount++;
      }

      // Batch 커밋
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`✅ 총 ${deleteCount}개의 관련 문서 삭제 완료`);
      } else {
        console.log('✅ 삭제할 관련 문서가 없습니다.');
      }

      return null;
    } catch (error) {
      console.error('❌ 프로젝트 관련 데이터 삭제 실패:', error);
      throw error;
    }
  });
