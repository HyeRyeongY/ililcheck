# Firebase 설정 가이드

이 프로젝트는 Firebase Firestore를 사용하여 작업 관리 데이터를 저장합니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: ililcheck)
4. Google Analytics는 선택사항 (필요시 활성화)
5. 프로젝트 생성 완료

## 2. Firestore 데이터베이스 설정

1. Firebase Console에서 생성한 프로젝트 선택
2. 왼쪽 메뉴에서 "Firestore Database" 클릭
3. "데이터베이스 만들기" 클릭
4. 보안 규칙 선택:
   - **테스트 모드**: 개발 중에는 테스트 모드로 시작
   - **프로덕션 모드**: 실제 배포 시 사용
5. Cloud Firestore 위치 선택 (예: asia-northeast3 - 서울)
6. "사용 설정" 클릭

## 3. 웹 앱 추가

1. Firebase 프로젝트 개요 페이지에서 "</>" (웹) 아이콘 클릭
2. 앱 닉네임 입력 (예: ililcheck-web)
3. "Firebase Hosting도 설정하기" 체크박스는 선택사항
4. "앱 등록" 클릭
5. Firebase SDK 구성 정보가 표시됨 - 이 정보를 복사

## 4. 환경 변수 설정

프로젝트 루트의 `.env.local` 파일을 열고 다음 값들을 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Firebase Console에서 복사한 값을 각 항목에 맞게 입력하세요.

## 5. Firebase Authentication 설정

1. Firebase Console에서 프로젝트 선택
2. 왼쪽 메뉴에서 "Authentication" 클릭
3. "시작하기" 클릭 (처음 사용하는 경우)
4. "Sign-in method" 탭 클릭
5. 다음 제공업체를 활성화:
   - **이메일/비밀번호**: 사용 설정
   - **Google**: 사용 설정 (선택사항, 소셜 로그인용)

## 6. Firestore 보안 규칙 설정

Firebase Console > Firestore Database > 규칙 탭에서 다음 규칙을 설정하거나, 프로젝트의 `firestore.rules` 파일을 Firebase CLI로 배포:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // 사용자 인증 확인 함수
    function isAuthenticated() {
      return request.auth != null;
    }

    // 사용자 본인 확인 함수
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // 프로젝트 규칙
    match /projects/{projectId} {
      // 읽기: 본인의 프로젝트만 조회 가능
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;

      // 생성: 로그인 사용자만 가능하고, userId가 본인 것이어야 함
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;

      // 업데이트: 본인의 프로젝트만 수정 가능
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;

      // 삭제: 본인의 프로젝트만 삭제 가능
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // 작업 그룹 규칙
    match /taskGroups/{groupId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // 작업 규칙
    match /tasks/{taskId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // 기본 규칙: 모든 다른 문서는 접근 거부
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**중요**: 이 규칙은 사용자 인증을 필수로 하며, 각 사용자는 본인의 데이터만 접근할 수 있습니다.

## 7. Firestore 데이터 구조

### tasks 컬렉션
```json
{
  "id": "자동생성ID",
  "userId": "사용자UID (필수)",
  "title": "작업 제목",
  "status": "todo | in_progress | completed | on_hold",
  "progress": 0-100,
  "dueDate": "YYYY-MM-DD (선택)",
  "projectId": "프로젝트ID (선택)",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### taskGroups 컬렉션
```json
{
  "id": "자동생성ID",
  "userId": "사용자UID (필수)",
  "name": "그룹 이름",
  "projectId": "프로젝트ID",
  "progress": 0-100,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### projects 컬렉션
```json
{
  "id": "자동생성ID",
  "userId": "사용자UID (필수)",
  "name": "프로젝트 이름",
  "color": "#3b82f6",
  "description": "설명",
  "startDate": "11월 12일",
  "endDate": "12월 3일",
  "progress": 0-100,
  "daysRemaining": 7,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 8. 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하면 로그인 페이지로 자동 리다이렉트됩니다.

## 주요 기능

- ✅ **사용자 인증**: 이메일/비밀번호 및 Google OAuth 로그인
- ✅ **사용자별 데이터 분리**: 각 사용자는 본인의 프로젝트와 작업만 볼 수 있음
- ✅ **작업 진행률**: 5%씩 조절 가능한 슬라이더
- ✅ **Firebase Firestore**: 실시간 동기화
- ✅ **작업 상태 변경**: TODO, 진행중, 완료, 보류
- ✅ **작업 관리**: 작업 추가, 수정, 삭제
- ✅ **프로젝트 그룹화**: 프로젝트별 작업 그룹화
- ✅ **진행률 자동 계산**: 작업 완료 시 자동 업데이트

## 문제 해결

### "Firebase: Error (auth/operation-not-allowed)" 오류
- Firebase Console > Authentication > Sign-in method에서 이메일/비밀번호 로그인 활성화

### Google 로그인 실패
- Firebase Console > Authentication > Sign-in method에서 Google 활성화
- 승인된 도메인 목록에 localhost 추가 확인

### 데이터가 저장되지 않음
- `.env.local` 파일의 환경 변수가 올바른지 확인
- Firestore 보안 규칙이 올바르게 설정되었는지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- 로그인 상태 확인

### "Permission denied" 오류
- 로그인이 되어 있는지 확인
- Firestore 보안 규칙에서 userId 필드가 올바르게 설정되었는지 확인
- Firebase Console > Firestore Database > 규칙 탭에서 위의 보안 규칙이 배포되었는지 확인

### 로그인 후 대시보드가 비어있음
- 새 사용자는 아직 프로젝트나 작업이 없는 상태입니다
- 프로젝트 추가 버튼으로 새 프로젝트를 생성하세요
