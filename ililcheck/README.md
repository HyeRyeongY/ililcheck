# ililcheck - 일일 업무 관리 시스템

프로젝트와 작업을 관리하고 일일 보고서를 작성하는 웹 애플리케이션입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel (예정)
- **Database**: Supabase (예정)

## 시작하기

### 개발 환경 설정

1. 의존성 설치:
```bash
npm install
```

2. 개발 서버 실행:
```bash
npm run dev
```

3. 브라우저에서 열기: http://localhost:3000

### 빌드

```bash
npm run build
npm start
```

## 주요 기능

- ✅ 프로젝트 관리
- ✅ 작업 관리 (할 일, 진행 중, 완료, 보류)
- ✅ 일일 보고서 생성
- ✅ 달력 뷰
- ✅ 진행률 추적
- ✅ JPG/PDF 내보내기 (예정)

## 프로젝트 구조

```
ililcheck/
├── app/
│   ├── dashboard/
│   │   ├── today/          # 오늘의 할 일
│   │   ├── calendar/       # 달력 뷰
│   │   ├── reports/        # 보고서
│   │   └── layout.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # 사이드바
│   │   └── Header.tsx      # 헤더
│   └── ui/
│       └── ProgressBar.tsx # 진행률 바
├── lib/
│   ├── types.ts           # 타입 정의
│   └── utils.ts           # 유틸리티 함수
└── hooks/                 # 커스텀 훅
```

## 다음 단계

1. Supabase 연결 및 데이터베이스 설정
2. 인증 시스템 구현
3. CRUD 기능 구현
4. 달력 뷰 구현
5. 오늘의 할 일 페이지 구현
6. PDF/JPG 내보내기 기능
