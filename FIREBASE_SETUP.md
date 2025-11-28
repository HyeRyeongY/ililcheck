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

## 6. Firestore 보안 규칙 설정 ⚠️ 중요!

**이 단계를 반드시 수행해야 관리자 기능이 작동합니다!**

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

    // 사용자 정보 컬렉션 규칙
    match /users/{userId} {
      // 모든 인증된 사용자가 읽을 수 있음 (관리자 페이지에서 사용자 목록 조회용)
      allow read: if isAuthenticated();

      // 사용자 자신의 정보는 생성/수정 가능
      allow create, update: if isAuthenticated() && request.auth.uid == userId;

      // 삭제는 금지
      allow delete: if false;
    }

    // 관리자 권한 컬렉션 규칙
    match /admins/{userId} {
      // 모든 인증된 사용자가 읽을 수 있음 (관리자 권한 체크용)
      allow read: if isAuthenticated();

      // 관리자만 관리자 권한을 부여/제거할 수 있음
      allow write: if isAuthenticated() && isAdmin();
    }

    // 관리자 권한 확인 함수
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }

    // 기본 규칙: 모든 다른 문서는 접근 거부
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**중요**: 이 규칙은 사용자 인증을 필수로 하며, 각 사용자는 본인의 데이터만 접근할 수 있습니다.

### 규칙 배포 방법

#### 방법 1: Firebase Console에서 직접 (권장)
1. Firebase Console > Firestore Database > **규칙** 탭
2. 위의 전체 코드를 복사하여 붙여넣기
3. **게시** 버튼 클릭

#### 방법 2: Firebase CLI 사용
```bash
firebase deploy --only firestore:rules
```

## 7. 초기 관리자 설정 🔐

**첫 관리자를 설정하는 방법:**

### 단계 1: 회원가입
1. 애플리케이션에서 회원가입 (이메일/비밀번호 또는 Google)
2. 로그인까지 완료

### 단계 2: UID 확인
1. [Firebase Console](https://console.firebase.google.com/) > **Authentication**
2. **Users** 탭에서 가입한 계정 찾기
3. **User UID** 복사 (예: `xYz123AbC...`)

### 단계 3: Firestore에서 관리자 권한 부여
1. Firebase Console > **Firestore Database** > **데이터** 탭
2. **컬렉션 시작** 클릭
3. 다음 정보 입력:

   **컬렉션 ID:**
   ```
   admins
   ```

4. **다음** 클릭
5. **문서 ID:**
   ```
   [복사한 User UID 붙여넣기]
   ```

6. **필드 추가:**

   첫 번째 필드:
   - 필드: `isAdmin`
   - 유형: `boolean`
   - 값: `true`

   두 번째 필드:
   - 필드: `grantedAt`
   - 유형: `timestamp`
   - 값: (현재 시간 자동)

7. **저장** 클릭

### 단계 4: 확인
1. 애플리케이션 새로고침 (Ctrl/Cmd + R)
2. 왼쪽 사이드바에 **"관리자"** 메뉴가 표시되는지 확인
3. 관리자 페이지 접속 테스트

### 이후 관리자 추가
초기 관리자 설정 후에는 애플리케이션 내에서 쉽게 관리할 수 있습니다:
1. 관리자 계정으로 로그인
2. 사이드바 **"관리자"** 메뉴 클릭
3. 사용자 목록에서 **"관리자 지정"** 버튼 클릭

## 8. Firestore 데이터 구조

### users 컬렉션 (자동 생성)
로그인/회원가입 시 자동으로 생성됩니다.
```json
{
  "uid": "사용자 UID",
  "email": "user@example.com",
  "displayName": "사용자 이름",
  "provider": "password" | "google.com",
  "createdAt": "Timestamp",
  "lastLoginAt": "Timestamp"
}
```

### admins 컬렉션 (수동 생성 필요)
위의 "초기 관리자 설정" 참조
```json
{
  "isAdmin": true,
  "grantedAt": "Timestamp"
}
```

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

## 9. 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하면 로그인 페이지로 자동 리다이렉트됩니다.

## 10. 주요 기능

- ✅ **사용자 인증**: 이메일/비밀번호 및 Google OAuth 로그인
- ✅ **관리자 시스템**: DB 기반 관리자 권한 관리
- ✅ **사용자 관리**: 관리자 페이지에서 사용자 정보 조회 및 권한 관리
- ✅ **사용자별 데이터 분리**: 각 사용자는 본인의 프로젝트와 작업만 볼 수 있음
- ✅ **작업 진행률**: 5%씩 조절 가능한 슬라이더
- ✅ **Firebase Firestore**: 실시간 동기화
- ✅ **작업 상태 변경**: TODO, 진행중, 완료, 보류
- ✅ **작업 관리**: 작업 추가, 수정, 삭제
- ✅ **프로젝트 그룹화**: 프로젝트별 작업 그룹화
- ✅ **진행률 자동 계산**: 작업 완료 시 자동 업데이트

## 11. 문제 해결

### "관리자 권한이 없습니다" / "Permission denied" 오류

#### 원인:
Firestore 보안 규칙이 업데이트되지 않았거나, 관리자 권한이 설정되지 않았습니다.

#### 해결 방법:

**1단계: Firestore 보안 규칙 확인**
1. Firebase Console > Firestore Database > **규칙** 탭
2. 현재 규칙에 `users`와 `admins` 컬렉션 규칙이 있는지 확인
3. 없다면 위의 "6. Firestore 보안 규칙 설정"의 전체 코드를 복사하여 붙여넣기
4. **게시** 버튼 클릭
5. 몇 초 기다린 후 애플리케이션 새로고침

**2단계: 관리자 권한 설정**
1. "7. 초기 관리자 설정" 섹션의 단계를 따라 진행
2. Firestore > **데이터** 탭에서 `admins` 컬렉션 생성
3. 자신의 UID로 문서 생성, `isAdmin: true` 설정

**3단계: 캐시 삭제 및 재로그인**
1. 로그아웃
2. 브라우저 캐시 삭제 또는 하드 새로고침 (Ctrl+Shift+R / Cmd+Shift+R)
3. 다시 로그인

### "Firebase: Error (auth/operation-not-allowed)" 오류
- Firebase Console > Authentication > Sign-in method에서 이메일/비밀번호 로그인 활성화

### Google 로그인 실패
- Firebase Console > Authentication > Sign-in method에서 Google 활성화
- 승인된 도메인 목록에 localhost 추가 확인

### 데이터가 저장되지 않음
- `.env.local` 파일의 환경 변수가 올바른지 확인
- Firestore 보안 규칙이 올바르게 설정되었는지 확인
- 브라우저 개발자 도구(F12) > Console 탭에서 에러 메시지 확인
- 로그인 상태 확인

### 사용자 정보가 관리자 페이지에 표시되지 않음
- 회원가입/로그인 시 자동으로 `users` 컬렉션에 저장됨
- Firestore > **데이터** 탭에서 `users` 컬렉션 확인
- 없다면 한 번 로그아웃 후 재로그인

### 로그인 후 대시보드가 비어있음
- 새 사용자는 아직 프로젝트나 작업이 없는 상태입니다
- 프로젝트 추가 버튼으로 새 프로젝트를 생성하세요

### Master 계정 설정 (옵션)
환경 변수로 영구 관리자를 설정할 수 있습니다:
```env
# .env.local
NEXT_PUBLIC_MASTER_EMAIL=your-admin-email@example.com
```
이 계정은 Firestore 설정과 무관하게 항상 관리자 권한을 가집니다.
