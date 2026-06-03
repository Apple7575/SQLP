# SQLP 스터디 대시보드

친구와의 SQLP 스터디 녹취 + 문제집을 외부 구독 AI로 정리한 JSON을 업로드하면,
사람·개념별 이해도와 페어 학습 큐를 보여주는 대시보드.

## 로컬 실행

1. 의존성 설치: `npm install`
2. `.env.local` 작성 (`.env.example` 참고): `DATABASE_URL`, `SHARED_PASSWORD`, `AUTH_SECRET`
3. DB 스키마 적용: `npm run db:push`
4. 개발 서버: `npm run dev` → http://localhost:3000 (공유 비밀번호로 로그인)
5. `/upload`에서 `fixtures/session-sample-1.json`, 이어서 `session-sample-2.json` 업로드

## 테스트

`npm test`

## 입력 JSON 양식

`docs/superpowers/specs/2026-06-03-sqlp-study-dashboard-design.md` 4장 참조.
샘플: `fixtures/session-sample-*.json`.

## 배포 (Vercel)

- Vercel 프로젝트 생성 + Vercel Postgres 추가 → `DATABASE_URL`(`POSTGRES_URL`) 연결
- 환경변수 `SHARED_PASSWORD`, `AUTH_SECRET` 설정
- 빌드 전 `npm run db:push`로 스키마 적용 (또는 `drizzle/` 마이그레이션 적용)
