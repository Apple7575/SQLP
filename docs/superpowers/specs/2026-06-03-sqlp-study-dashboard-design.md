# SQLP 페어 학습 대시보드 — 설계 문서

- **작성일**: 2026-06-03
- **시험일**: 2026년 8월 중순 (약 10주 남음)
- **사용자**: 2명 (나 + 스터디 친구 1명)

---

## 1. 한 줄 정의

> 친구와의 SQLP 스터디 녹취(STT) + 문제집/개념서를 구독제 AI(Gemini/GPT)로 정리·판정해 만든 **JSON 하나**를 입력받아, **사람·개념별 이해도**를 시각화하고 **다음 세션의 페어 학습 큐**를 생성하는 웹 대시보드.

## 2. 핵심 원칙

1. **앱 안에 AI·OCR·LLM API 없음.** 모든 무거운 작업(OCR, STT 정리, 문제 분할, 발화자 구분, 이해도 판정)은 사용자가 앱 밖에서 본인 구독제 AI로 수행하고, 결과를 정해진 JSON 양식으로 앱에 업로드한다. → 앱 운영 비용 0, 외부 의존성 0.
2. **하루 = JSON 한 파일.** 실시간 문제별 피드백이 아니라, 하루치 스터디 전체를 설명한 전체 STT를 한 번에 업로드한다.
3. **입력 JSON 양식(인터페이스 계약)이 시스템의 중심.** 이 양식이 잘 정의돼야 사용자의 AI 프롬프트도 깔끔하고 대시보드도 풍부해진다.
4. **예쁘게.** Stripe / shadcn 스타일의 깨끗하고 가독성 높은 데이터 중심 UI.

## 3. 기술 스택

- **풀스택**: 올-Vercel TypeScript. Next.js 14 (App Router) + TypeScript.
- **UI**: shadcn/ui + Tailwind CSS + Recharts (차트).
- **DB**: Vercel Postgres + Drizzle ORM (+ drizzle-kit 마이그레이션).
- **검증**: Zod (업로드 JSON 검증).
- **인증**: NextAuth + 공유 비밀번호 1개 (너+친구 동일 비번). 매직링크는 v2.
- **테스트**: Vitest.
- **배포**: Vercel (frontend + API routes + Postgres 모두 한 플랫폼). 무료/저가 티어로 충분.

## 4. 입력 JSON 양식 (풀 스키마)

단위: **하루 = 한 파일**.

```json
{
  "session_date": "2026-06-04",
  "book": "문제집A",
  "speakers": ["나", "민수"],
  "problems": [
    {
      "problem_number": 5,
      "chapter": 2,
      "problem_text": "다음 SQL의 실행계획에서...",
      "solution_text": "정답 해설 OCR 원문...",
      "syllabus_area": "SQL 고급 활용 및 튜닝",
      "concepts": ["인덱스 선택성", "옵티마이저 통계", "히스토그램"],
      "explanations": [
        {
          "speaker": "나",
          "transcript": "이 문제는 인덱스 선택성이 낮아서...",
          "understanding": "애매",
          "concepts_covered": ["인덱스 선택성"],
          "concepts_missed": ["옵티마이저 통계"],
          "errors": ["풀스캔이 항상 느리다고 잘못 말함"],
          "feedback": "선택성 개념은 맞았으나 통계 정보 언급이 빠짐"
        },
        {
          "speaker": "민수",
          "transcript": "...",
          "understanding": "잘함",
          "concepts_covered": ["인덱스 선택성", "옵티마이저 통계", "히스토그램"],
          "concepts_missed": [],
          "errors": [],
          "feedback": "핵심 다 짚음"
        }
      ]
    }
  ]
}
```

### 필드 정의

| 필드 | 타입 | 채우는 주체 | 용도 |
|---|---|---|---|
| `session_date` | `date` (YYYY-MM-DD) | 사용자 | 시간순 이해도 변화, 세션 타임라인 |
| `book` | `string` | 구독 AI | 문제 식별 + 필터 |
| `speakers` | `string[]` | 사용자 | 발화자 목록 (참고용; 사실상 explanations에서 도출) |
| `problems[].problem_number` | `int` | 구독 AI | 문제 식별 |
| `problems[].chapter` | `int?` | 구독 AI | 번호 중복 시 식별 (옵션) |
| `problems[].problem_text` | `string` | 구독 AI (OCR) | 복습 뷰 — 문제 본문 |
| `problems[].solution_text` | `string` | 구독 AI (OCR) | 복습 뷰 — PDF 해설 |
| `problems[].syllabus_area` | `string` (3과목 enum) | 구독 AI | 과목별 진척률 |
| `problems[].concepts` | `string[]` | 구독 AI | 개념 단위 약점맵 |
| `explanations[].speaker` | `string` | 구독 AI | 발화자 식별 |
| `explanations[].transcript` | `string` | 구독 AI (STT) | 복습 뷰 — 설명 원문 |
| `explanations[].understanding` | `'잘함'\|'애매'\|'모름'` | 구독 AI 판정 | 약점맵·페어큐 핵심 점수 |
| `explanations[].concepts_covered` | `string[]` | 구독 AI 판정 | 개념 단위 이해도 집계 |
| `explanations[].concepts_missed` | `string[]` | 구독 AI 판정 | 페어큐 정밀화 |
| `explanations[].errors` | `string[]` | 구독 AI 판정 | 반복 오개념 추적 |
| `explanations[].feedback` | `string` | 구독 AI | 복습 뷰 코멘트 |

### SQLP 공식 3과목 (`syllabus_area` enum)

1. 데이터 모델링의 이해
2. SQL 기본 및 활용
3. SQL 고급 활용 및 튜닝

> v2에서 책 목차 기준 중분류(예: 옵티마이저/인덱스/조인)로 세분화 예정.

### `understanding` 척도

3단계 고정: `잘함` / `애매` / `모름`.

## 5. 화면 구성 (6개)

좌측 사이드바 네비게이션 + 우측 콘텐츠. **구현 우선순위: 1·2·3·4 먼저 → 5·6 나중에 얹기.**

### ① ⬆️ 업로드 (필수)
- JSON drag & drop.
- 저장 전 **검증 미리보기**: 문제 수, 발화 수, 누락/형식 오류 필드를 한국어로 표시.
- 확정 시에만 저장. 부분 저장 허용(멀쩡한 문제만 넣고 깨진 건 스킵·목록 표시).
- 같은 문제 재업로드 시 새 세션 행으로 누적(이해도 변화 추적).

### ② 📖 문제 복습 뷰 (필수 — 핵심 학습 화면)
- 문제 선택 → 나란히 표시:
  - 왼쪽: `problem_text` + `solution_text` (PDF 해설).
  - 오른쪽: 발화자별 `transcript` + 이해도 뱃지 + `concepts_missed` + `feedback`.
- "모름만 보기" 필터(복습 모드).

### ③ 🔥 약점 히트맵 (필수)
- **사람 × 개념** 그리드. 셀 색: 잘함(초록)/애매(노랑)/모름(빨강)/미학습(회색).
- 과목 필터, 사람 필터.
- 셀 클릭 → 해당 개념이 나온 문제로 drill-down.

### ④ 🤝 페어 학습 큐 (시그니처 기능)
- 자동 생성 3묶음:
  - **A→B 가르치기**: 친구는 `잘함`, 나는 `모름`인 개념 → 다음 세션에 친구가 설명.
  - **B→A 가르치기**: 반대.
  - **🔴 둘 다 모름**: PDF 재독 필요 개념.
- 각 항목에 관련 문제 번호 + 개념 표시.

### ⑤ 📅 세션 타임라인 (후순위)
- 날짜별 세션 카드 → 그 세션의 문제 목록 + 사람별 이해도.

### ⑥ 🏠 홈 Overview (후순위)
- 과목별 진척률 3카드 + 사람별 이해도 요약 스택바 + 최근 세션 + 오늘의 페어큐 배너.

## 6. DB 스키마 (Postgres + Drizzle)

```
problems                          -- 책의 문제 (고유)
  id             uuid pk
  book           text
  chapter        int  null
  problem_number int
  problem_text   text
  solution_text  text
  syllabus_area  text             -- 3과목 중 하나 (외값은 '미분류')
  concepts       jsonb            -- string[]
  UNIQUE(book, chapter, problem_number)

sessions                          -- 하루 업로드 = 1 세션
  id            uuid pk
  session_date  date
  book          text
  speakers      jsonb            -- string[]
  created_at    timestamptz

explanations                      -- (세션 × 문제 × 발화자) 1행
  id                uuid pk
  session_id        uuid fk → sessions
  problem_id        uuid fk → problems
  speaker           text
  transcript        text
  understanding     text         -- '잘함' | '애매' | '모름'
  concepts_covered  jsonb        -- string[]
  concepts_missed   jsonb        -- string[]
  errors            jsonb        -- string[]
  feedback          text
```

- 약점맵·페어큐·진척률은 전부 `explanations` 집계 쿼리로 계산(별도 집계 테이블 없음).
- 같은 문제를 여러 세션에서 설명 → `explanations` 여러 행 → 시간순 이해도 변화 자연 추적.

## 7. 디렉토리 구조

```
sqlp/
├─ app/
│  ├─ (dashboard)/
│  │  ├─ page.tsx              # 홈
│  │  ├─ weakness/page.tsx     # 약점맵
│  │  ├─ pair-queue/page.tsx
│  │  ├─ sessions/page.tsx
│  │  ├─ review/page.tsx
│  │  └─ upload/page.tsx
│  ├─ api/
│  │  ├─ sessions/route.ts     # POST 업로드, GET 목록
│  │  └─ insights/route.ts     # 집계 (약점맵·페어큐)
│  └─ layout.tsx               # 사이드바 + NextAuth
├─ lib/
│  ├─ db/schema.ts             # Drizzle 스키마
│  ├─ db/queries.ts            # 집계 쿼리
│  ├─ ingest/validate.ts       # JSON Zod 검증
│  └─ insights/                # 약점·페어큐 계산 (순수 함수)
├─ components/ui/              # shadcn
└─ drizzle/                    # 마이그레이션
```

## 8. 검증 · 에러 처리

### 업로드 검증 (Zod)
- 업로드 JSON을 Zod 스키마로 1차 검증 → 어긋난 필드를 한국어로 표시.
- 검증 미리보기 후 확정 저장.
- `understanding`은 enum 강제(`잘함/애매/모름`); 오타는 여기서 차단.
- 부분 저장: 멀쩡한 문제만 저장, 깨진 문제는 목록으로 보고.

### 에러 처리 규칙
- **중복 문제** (`book, chapter, problem_number` 동일): 문제 본문은 갱신, 설명은 새 세션 행으로 누적.
- **빈 개념 배열**: 허용(집계에서 무시).
- **알 수 없는 `syllabus_area`**: 3과목에 없으면 `'미분류'`로 보관 + 업로드 시 경고.
- **DB 실패**: 세션 단위 트랜잭션으로 원자적 저장(반쯤 저장 방지).

## 9. 테스트 전략

- **순수 함수 우선**: 약점맵·페어큐 계산(`lib/insights/`)은 입력→출력 순수 함수로 작성, 단위 테스트 집중.
- **검증 로직**: 정상/깨진 JSON 픽스처로 Zod 검증 테스트.
- **샘플 데이터**: 가짜 세션 JSON 2~3개로 전체 플로우·화면 확인(실제 데이터 도착 전 개발 가능).
- 프레임워크: Vitest.

## 10. 범위 밖 (v2 이후)

- Anki 카드 자동 export.
- syllabus 중분류 세분화.
- 매직링크 인증.
- 반복 오개념 패턴 자동 탐지(데이터는 `errors` 필드로 쌓아둠).
- 앱 내 OCR/STT/LLM 처리.

## 11. 확정된 의사결정 로그

- 핵심 기능은 B(문제 풀이 & 이해도 추적) → 페어 학습으로 확장.
- 오디오/STT/OCR/이해도 판정 전부 앱 밖(구독 AI)에서 처리, 앱은 JSON 수신·표시 전담.
- 배포: 올-Vercel TypeScript 풀스택.
- 디자인 톤: Stripe/shadcn.
- 이해도 척도: 3단계. syllabus: 공식 3과목 고정.
- JSON: 풀 스키마(개념별 covered/missed/errors 포함).
- 화면 6개 전부 구현(우선순위 1·2·3·4 → 5·6).
