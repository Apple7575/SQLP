# SQLP Study Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js dashboard that ingests one JSON file per study session (produced externally by a subscription AI) and visualizes per-person, per-concept SQLP exam understanding plus an auto-generated pair-teaching queue.

**Architecture:** All-Vercel TypeScript full-stack. Pure functions (`lib/ingest`, `lib/insights`) hold all logic and are unit-tested in isolation. A thin Drizzle/Postgres layer persists data and is tested against an in-process PGlite database. Two API routes (`POST /api/sessions`, `GET /api/data`) bridge to six shadcn/ui screens. No AI/OCR/LLM runs inside the app.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Recharts · Drizzle ORM + Postgres (PGlite for tests) · Zod · Vitest + Testing Library · cookie-based shared-password auth.

**Reference spec:** `docs/superpowers/specs/2026-06-03-sqlp-study-dashboard-design.md`

---

## File Structure

```
sqlp/
├─ app/
│  ├─ (dashboard)/layout.tsx        # sidebar shell
│  ├─ (dashboard)/page.tsx          # 🏠 home overview
│  ├─ (dashboard)/weakness/page.tsx # 🔥 heatmap
│  ├─ (dashboard)/pair-queue/page.tsx
│  ├─ (dashboard)/sessions/page.tsx
│  ├─ (dashboard)/review/page.tsx
│  ├─ (dashboard)/upload/page.tsx
│  ├─ api/sessions/route.ts         # POST ingest
│  ├─ api/data/route.ts             # GET records + problems
│  ├─ api/login/route.ts            # POST shared password
│  ├─ login/page.tsx
│  ├─ layout.tsx                    # root html
│  └─ globals.css
├─ lib/
│  ├─ types.ts                      # JSON contract types + constants
│  ├─ auth.ts                       # shared-password token
│  ├─ ingest/schema.ts              # Zod schemas
│  ├─ ingest/validate.ts            # validation preview (pure)
│  ├─ insights/types.ts             # ExplanationRecord, Status
│  ├─ insights/helpers.ts           # shared pure helpers
│  ├─ insights/weakness.ts          # heatmap (pure)
│  ├─ insights/pairQueue.ts         # pair queue (pure)
│  ├─ insights/syllabus.ts          # area progress (pure)
│  ├─ db/schema.ts                  # Drizzle tables
│  ├─ db/index.ts                   # prod connection + DB type
│  └─ db/queries.ts                 # ingestSession, getAllRecords, getProblemsWithExplanations
├─ components/                      # shadcn ui + app components
├─ test/helpers/testDb.ts          # PGlite test db
├─ drizzle/                         # generated migrations
├─ middleware.ts                    # auth gate
├─ drizzle.config.ts
├─ vitest.config.ts
└─ package.json
```

**Build order:** Phase 0 scaffold → Phase 1 contract+validation → Phase 2 insights → Phase 3 DB → Phase 4 API → Phase 5 auth → Phase 6 UI (screens in spec priority 1·2·3·4 then 5·6) → Phase 7 fixtures/docs.

---

## Phase 0 — Scaffolding

### Task 1: Initialize Next.js project + dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`, `app/globals.css`, `.gitignore`, `.env.example`

- [ ] **Step 1: Scaffold Next.js in the current directory**

Run (the trailing `.` targets the existing folder; answer prompts as shown):

```bash
npx create-next-app@14 . --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --no-turbopack
```

If it refuses because the directory is non-empty, move `docs/` aside first:

```bash
mv docs /tmp/sqlp-docs && npx create-next-app@14 . --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --no-turbopack && rm -rf /tmp/sqlp-docs/../docs 2>/dev/null; mv /tmp/sqlp-docs docs
```

Expected: `app/`, `package.json`, `tailwind.config.ts`, `tsconfig.json` created.

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install drizzle-orm postgres zod recharts lucide-react
npm install -D drizzle-kit @electric-sql/pglite vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom vite-tsconfig-paths
```

Expected: installs succeed, `package.json` lists all packages.

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example <<'EOF'
# Postgres connection (Vercel Postgres provides POSTGRES_URL)
DATABASE_URL=postgres://user:pass@localhost:5432/sqlp
# Shared login password (both users type this)
SHARED_PASSWORD=change-me
# Secret used to sign the auth cookie (any long random string)
AUTH_SECRET=replace-with-32+-random-chars
EOF
cp .env.example .env.local
```

- [ ] **Step 4: Verify dev server boots**

Run: `npm run dev` then open `http://localhost:3000`, confirm the Next.js default page renders, then stop the server (Ctrl-C).
Expected: page loads without errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with core dependencies"
```

---

### Task 2: Configure Vitest + shadcn/ui

**Files:**
- Create: `vitest.config.ts`, `test/setup.ts`, `components.json` (via shadcn)
- Modify: `package.json` (test script), `app/globals.css` (shadcn tokens)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: Create `test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block add:

```json
"test": "vitest run",
"test:watch": "vitest",
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push"
```

- [ ] **Step 4: Add a smoke test to prove Vitest works**

Create `test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: Initialize shadcn/ui and add components**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card badge table input label sonner separator tabs
```

Expected: `components/ui/*.tsx` created, `components.json` present, `app/globals.css` gains CSS variables.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: configure vitest and shadcn/ui"
```

---

## Phase 1 — Data Contract & Validation

### Task 3: Domain types and constants

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export const UNDERSTANDING = ['잘함', '애매', '모름'] as const
export type Understanding = (typeof UNDERSTANDING)[number]

export const SYLLABUS_AREAS = [
  '데이터 모델링의 이해',
  'SQL 기본 및 활용',
  'SQL 고급 활용 및 튜닝',
] as const
export type SyllabusArea = (typeof SYLLABUS_AREAS)[number]

export const UNCLASSIFIED = '미분류'

export interface Explanation {
  speaker: string
  transcript: string
  understanding: Understanding
  concepts_covered: string[]
  concepts_missed: string[]
  errors: string[]
  feedback: string
}

export interface ProblemInput {
  problem_number: number
  chapter: number // 0 = no chapter
  problem_text: string
  solution_text: string
  syllabus_area: string // normalized to a SyllabusArea or UNCLASSIFIED
  concepts: string[]
  explanations: Explanation[]
}

export interface SessionInput {
  session_date: string // YYYY-MM-DD
  book: string
  speakers: string[]
  problems: ProblemInput[]
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts && git commit -m "feat: add domain types and SQLP constants"
```

---

### Task 4: Zod ingest schemas

**Files:**
- Create: `lib/ingest/schema.ts`
- Test: `lib/ingest/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { explanationSchema, problemSchema, sessionSchema } from './schema'

describe('ingest schemas', () => {
  it('accepts a valid explanation and fills array defaults', () => {
    const parsed = explanationSchema.parse({
      speaker: '나',
      transcript: 'x',
      understanding: '애매',
    })
    expect(parsed.concepts_covered).toEqual([])
    expect(parsed.errors).toEqual([])
    expect(parsed.feedback).toBe('')
  })

  it('rejects an invalid understanding value', () => {
    const r = explanationSchema.safeParse({ speaker: '나', transcript: 'x', understanding: '잘 함' })
    expect(r.success).toBe(false)
  })

  it('rejects a problem with zero explanations', () => {
    const r = problemSchema.safeParse({
      problem_number: 5, problem_text: 'p', solution_text: 's',
      syllabus_area: 'SQL 기본 및 활용', explanations: [],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a session with a bad date format', () => {
    const r = sessionSchema.safeParse({ session_date: '2026/06/04', book: 'A' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- schema`
Expected: FAIL (`Cannot find module './schema'`).

- [ ] **Step 3: Write `lib/ingest/schema.ts`**

```ts
import { z } from 'zod'

export const explanationSchema = z.object({
  speaker: z.string().min(1),
  transcript: z.string(),
  understanding: z.enum(['잘함', '애매', '모름']),
  concepts_covered: z.array(z.string()).default([]),
  concepts_missed: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  feedback: z.string().default(''),
})

export const problemSchema = z.object({
  problem_number: z.number().int(),
  chapter: z.number().int().nullable().optional(),
  problem_text: z.string(),
  solution_text: z.string(),
  syllabus_area: z.string(),
  concepts: z.array(z.string()).default([]),
  explanations: z.array(explanationSchema).min(1),
})

// problems validated per-item in validate() so one bad problem does not fail the whole upload
export const sessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  book: z.string().min(1),
  speakers: z.array(z.string()).default([]),
  problems: z.array(z.unknown()).default([]),
})
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- schema`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ingest/schema.ts lib/ingest/schema.test.ts && git commit -m "feat: add Zod ingest schemas"
```

---

### Task 5: Validation preview (`validate`)

**Files:**
- Create: `lib/ingest/validate.ts`
- Test: `lib/ingest/validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { validate } from './validate'

const good = {
  session_date: '2026-06-04',
  book: '문제집A',
  speakers: ['나', '민수'],
  problems: [
    {
      problem_number: 5,
      problem_text: 'p', solution_text: 's',
      syllabus_area: 'SQL 고급 활용 및 튜닝',
      concepts: ['인덱스'],
      explanations: [
        { speaker: '나', transcript: 't', understanding: '애매', concepts_covered: ['인덱스'], concepts_missed: [], errors: [], feedback: 'f' },
      ],
    },
  ],
}

describe('validate', () => {
  it('returns counts and no warnings for clean input', () => {
    const r = validate(good)
    expect(r.ok).toBe(true)
    expect(r.problemCount).toBe(1)
    expect(r.explanationCount).toBe(1)
    expect(r.warnings).toHaveLength(0)
    expect(r.session?.problems[0].chapter).toBe(0)
  })

  it('returns a fatalError for malformed top-level JSON', () => {
    const r = validate({ book: 'A' })
    expect(r.ok).toBe(false)
    expect(r.fatalError).toBeTruthy()
  })

  it('skips a broken problem but keeps the good ones (partial save)', () => {
    const mixed = { ...good, problems: [good.problems[0], { problem_number: 9 }] }
    const r = validate(mixed)
    expect(r.ok).toBe(true)
    expect(r.problemCount).toBe(1)
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0].problemNumber).toBe(9)
  })

  it('normalizes an unknown syllabus_area to 미분류 with a warning', () => {
    const odd = { ...good, problems: [{ ...good.problems[0], syllabus_area: '옵티마이저' }] }
    const r = validate(odd)
    expect(r.session?.problems[0].syllabus_area).toBe('미분류')
    expect(r.warnings.some(w => w.message.includes('미분류'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- validate`
Expected: FAIL (`Cannot find module './validate'`).

- [ ] **Step 3: Write `lib/ingest/validate.ts`**

```ts
import { sessionSchema, problemSchema } from './schema'
import { SYLLABUS_AREAS, UNCLASSIFIED, type SessionInput, type ProblemInput } from '@/lib/types'

export interface ValidationWarning {
  problemIndex: number
  problemNumber?: number
  message: string
}

export interface ValidationResult {
  ok: boolean
  fatalError?: string
  session?: SessionInput
  problemCount: number
  explanationCount: number
  warnings: ValidationWarning[]
}

const KNOWN_AREAS: string[] = [...SYLLABUS_AREAS]

export function validate(raw: unknown): ValidationResult {
  const top = sessionSchema.safeParse(raw)
  if (!top.success) {
    return {
      ok: false,
      fatalError: top.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
      problemCount: 0,
      explanationCount: 0,
      warnings: [],
    }
  }

  const warnings: ValidationWarning[] = []
  const validProblems: ProblemInput[] = []
  let explanationCount = 0

  top.data.problems.forEach((p, idx) => {
    const parsed = problemSchema.safeParse(p)
    if (!parsed.success) {
      const pn = (p as { problem_number?: unknown })?.problem_number
      warnings.push({
        problemIndex: idx,
        problemNumber: typeof pn === 'number' ? pn : undefined,
        message: `문제 파싱 실패 (스킵됨): ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join(', ')}`,
      })
      return
    }
    const prob = parsed.data
    let area = prob.syllabus_area
    if (!KNOWN_AREAS.includes(area)) {
      warnings.push({
        problemIndex: idx,
        problemNumber: prob.problem_number,
        message: `알 수 없는 syllabus_area "${area}" → '${UNCLASSIFIED}'로 저장`,
      })
      area = UNCLASSIFIED
    }
    validProblems.push({
      problem_number: prob.problem_number,
      chapter: prob.chapter ?? 0,
      problem_text: prob.problem_text,
      solution_text: prob.solution_text,
      syllabus_area: area,
      concepts: prob.concepts,
      explanations: prob.explanations,
    })
    explanationCount += prob.explanations.length
  })

  return {
    ok: true,
    session: {
      session_date: top.data.session_date,
      book: top.data.book,
      speakers: top.data.speakers,
      problems: validProblems,
    },
    problemCount: validProblems.length,
    explanationCount,
    warnings,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- validate`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ingest/validate.ts lib/ingest/validate.test.ts && git commit -m "feat: add upload validation preview"
```

---

## Phase 2 — Insights (pure functions)

### Task 6: Insight record type + shared helpers

**Files:**
- Create: `lib/insights/types.ts`, `lib/insights/helpers.ts`
- Test: `lib/insights/helpers.test.ts`

- [ ] **Step 1: Write `lib/insights/types.ts`**

```ts
import type { Understanding } from '@/lib/types'

export interface ExplanationRecord {
  sessionDate: string // YYYY-MM-DD
  book: string
  problemNumber: number
  chapter: number // 0 = none
  syllabusArea: string
  problemConcepts: string[]
  speaker: string
  understanding: Understanding
  conceptsCovered: string[]
  conceptsMissed: string[]
  errors: string[]
  feedback: string
  transcript: string
}

export type Status = Understanding | '미학습'
```

- [ ] **Step 2: Write the failing test for helpers**

```ts
import { describe, it, expect } from 'vitest'
import { uniqueSpeakers, uniqueConcepts, problemKey, byDateAsc } from './helpers'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '애매', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('insight helpers', () => {
  it('lists unique sorted speakers', () => {
    expect(uniqueSpeakers([rec({ speaker: '민수' }), rec({ speaker: '나' }), rec({ speaker: '나' })]))
      .toEqual(['나', '민수'])
  })

  it('collects concepts from problem/covered/missed', () => {
    expect(uniqueConcepts([rec({ problemConcepts: ['a'], conceptsCovered: ['b'], conceptsMissed: ['c'] })]))
      .toEqual(['a', 'b', 'c'])
  })

  it('builds a stable problem key including book and chapter', () => {
    expect(problemKey({ book: 'A', chapter: 2, problemNumber: 5 })).toBe('A__2__5')
  })

  it('sorts records ascending by date', () => {
    const out = byDateAsc([rec({ sessionDate: '2026-06-05' }), rec({ sessionDate: '2026-06-01' })])
    expect(out[0].sessionDate).toBe('2026-06-01')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- helpers`
Expected: FAIL (`Cannot find module './helpers'`).

- [ ] **Step 4: Write `lib/insights/helpers.ts`**

```ts
import type { ExplanationRecord } from './types'

export function uniqueSpeakers(records: ExplanationRecord[]): string[] {
  return [...new Set(records.map(r => r.speaker))].sort()
}

export function uniqueConcepts(records: ExplanationRecord[]): string[] {
  const s = new Set<string>()
  for (const r of records) {
    r.problemConcepts.forEach(c => s.add(c))
    r.conceptsCovered.forEach(c => s.add(c))
    r.conceptsMissed.forEach(c => s.add(c))
  }
  return [...s].sort()
}

export function problemKey(r: { book: string; chapter: number; problemNumber: number }): string {
  return `${r.book}__${r.chapter}__${r.problemNumber}`
}

export function byDateAsc(records: ExplanationRecord[]): ExplanationRecord[] {
  return [...records].sort((a, b) =>
    a.sessionDate < b.sessionDate ? -1 : a.sessionDate > b.sessionDate ? 1 : 0,
  )
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- helpers`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/insights/types.ts lib/insights/helpers.ts lib/insights/helpers.test.ts && git commit -m "feat: add insight record type and helpers"
```

---

### Task 7: Weakness heatmap

**Files:**
- Create: `lib/insights/weakness.ts`
- Test: `lib/insights/weakness.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computeWeaknessMap } from './weakness'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '애매', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('computeWeaknessMap', () => {
  it('produces a full speaker × concept grid with 미학습 fallback', () => {
    const r = computeWeaknessMap([
      rec({ speaker: '나', conceptsCovered: ['인덱스'], understanding: '잘함' }),
      rec({ speaker: '민수', problemConcepts: ['조인'] }),
    ])
    expect(r.speakers).toEqual(['나', '민수'])
    expect(r.concepts).toEqual(['인덱스', '조인'])
    const cell = (s: string, c: string) => r.cells.find(x => x.speaker === s && x.concept === c)!
    expect(cell('나', '인덱스').status).toBe('잘함')
    expect(cell('민수', '인덱스').status).toBe('미학습')
  })

  it('uses the latest session status for a concept', () => {
    const r = computeWeaknessMap([
      rec({ sessionDate: '2026-06-01', conceptsMissed: ['인덱스'] }),
      rec({ sessionDate: '2026-06-05', conceptsCovered: ['인덱스'], understanding: '잘함' }),
    ])
    expect(r.cells.find(x => x.concept === '인덱스')!.status).toBe('잘함')
  })

  it('marks a missed concept as 모름', () => {
    const r = computeWeaknessMap([rec({ conceptsMissed: ['통계'] })])
    expect(r.cells.find(x => x.concept === '통계')!.status).toBe('모름')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- weakness`
Expected: FAIL (`Cannot find module './weakness'`).

- [ ] **Step 3: Write `lib/insights/weakness.ts`**

```ts
import type { ExplanationRecord, Status } from './types'
import { byDateAsc, uniqueConcepts, uniqueSpeakers } from './helpers'

export interface WeaknessCell {
  speaker: string
  concept: string
  status: Status
  syllabusArea: string | null
}

export interface WeaknessMap {
  speakers: string[]
  concepts: string[]
  cells: WeaknessCell[]
}

export function computeWeaknessMap(records: ExplanationRecord[]): WeaknessMap {
  const speakers = uniqueSpeakers(records)
  const concepts = uniqueConcepts(records)

  const latest = new Map<string, { status: Status; area: string }>()
  for (const r of byDateAsc(records)) {
    for (const c of r.conceptsCovered) {
      latest.set(`${r.speaker}::${c}`, { status: r.understanding, area: r.syllabusArea })
    }
    for (const c of r.conceptsMissed) {
      latest.set(`${r.speaker}::${c}`, { status: '모름', area: r.syllabusArea })
    }
  }

  const cells: WeaknessCell[] = []
  for (const speaker of speakers) {
    for (const concept of concepts) {
      const hit = latest.get(`${speaker}::${concept}`)
      cells.push({
        speaker,
        concept,
        status: hit?.status ?? '미학습',
        syllabusArea: hit?.area ?? null,
      })
    }
  }
  return { speakers, concepts, cells }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- weakness`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/insights/weakness.ts lib/insights/weakness.test.ts && git commit -m "feat: add weakness heatmap computation"
```

---

### Task 8: Pair-teaching queue

**Files:**
- Create: `lib/insights/pairQueue.ts`
- Test: `lib/insights/pairQueue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computePairQueue } from './pairQueue'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '애매', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('computePairQueue', () => {
  it('creates a teach item when one knows and the other does not', () => {
    const q = computePairQueue([
      rec({ speaker: '민수', conceptsCovered: ['인덱스'], understanding: '잘함', problemConcepts: ['인덱스'], problemNumber: 5 }),
      rec({ speaker: '나', conceptsMissed: ['인덱스'], problemConcepts: ['인덱스'], problemNumber: 5 }),
    ])
    const item = q.find(i => i.concept === '인덱스')!
    expect(item.kind).toBe('teach')
    expect(item.teacher).toBe('민수')
    expect(item.learner).toBe('나')
    expect(item.relatedProblems).toEqual([{ book: 'A', chapter: 0, problemNumber: 5 }])
  })

  it('creates a both_unknown item when nobody knows it', () => {
    const q = computePairQueue([
      rec({ speaker: '민수', conceptsMissed: ['통계'] }),
      rec({ speaker: '나', conceptsMissed: ['통계'] }),
    ])
    const item = q.find(i => i.concept === '통계')!
    expect(item.kind).toBe('both_unknown')
    expect(item.teacher).toBeNull()
  })

  it('omits concepts everyone already knows', () => {
    const q = computePairQueue([
      rec({ speaker: '민수', conceptsCovered: ['조인'], understanding: '잘함' }),
      rec({ speaker: '나', conceptsCovered: ['조인'], understanding: '잘함' }),
    ])
    expect(q.find(i => i.concept === '조인')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- pairQueue`
Expected: FAIL (`Cannot find module './pairQueue'`).

- [ ] **Step 3: Write `lib/insights/pairQueue.ts`**

```ts
import type { ExplanationRecord } from './types'
import type { Understanding } from '@/lib/types'
import { byDateAsc, problemKey, uniqueConcepts } from './helpers'

export interface RelatedProblem {
  book: string
  chapter: number
  problemNumber: number
}

export interface PairQueueItem {
  concept: string
  kind: 'teach' | 'both_unknown'
  teacher: string | null
  learner: string | null
  relatedProblems: RelatedProblem[]
}

export function computePairQueue(records: ExplanationRecord[]): PairQueueItem[] {
  const concepts = uniqueConcepts(records)
  const speakers = [...new Set(records.map(r => r.speaker))].sort()

  const latest = new Map<string, Understanding>()
  for (const r of byDateAsc(records)) {
    for (const c of r.conceptsCovered) latest.set(`${r.speaker}::${c}`, r.understanding)
    for (const c of r.conceptsMissed) latest.set(`${r.speaker}::${c}`, '모름')
  }

  const related = new Map<string, Map<string, RelatedProblem>>()
  for (const r of records) {
    const cs = new Set([...r.problemConcepts, ...r.conceptsCovered, ...r.conceptsMissed])
    for (const c of cs) {
      if (!related.has(c)) related.set(c, new Map())
      related.get(c)!.set(problemKey(r), { book: r.book, chapter: r.chapter, problemNumber: r.problemNumber })
    }
  }

  const items: PairQueueItem[] = []
  for (const concept of concepts) {
    const statuses = speakers
      .map(s => ({ speaker: s, status: latest.get(`${s}::${concept}`) }))
      .filter((x): x is { speaker: string; status: Understanding } => x.status !== undefined)
    if (statuses.length === 0) continue

    const teachers = statuses.filter(s => s.status === '잘함')
    const learners = statuses.filter(s => s.status === '모름')
    const relatedProblems = [...(related.get(concept)?.values() ?? [])]

    if (teachers.length > 0 && learners.length > 0) {
      items.push({ concept, kind: 'teach', teacher: teachers[0].speaker, learner: learners[0].speaker, relatedProblems })
    } else if (teachers.length === 0 && learners.length > 0) {
      items.push({ concept, kind: 'both_unknown', teacher: null, learner: null, relatedProblems })
    }
  }
  return items
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- pairQueue`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/insights/pairQueue.ts lib/insights/pairQueue.test.ts && git commit -m "feat: add pair-teaching queue computation"
```

---

### Task 9: Syllabus area progress

**Files:**
- Create: `lib/insights/syllabus.ts`
- Test: `lib/insights/syllabus.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computeSyllabusProgress } from './syllabus'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '잘함', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('computeSyllabusProgress', () => {
  it('counts latest understanding per speaker per area and computes mastered %', () => {
    const out = computeSyllabusProgress([
      rec({ speaker: '나', problemNumber: 1, understanding: '잘함' }),
      rec({ speaker: '나', problemNumber: 2, understanding: '모름' }),
    ])
    const area = out.find(a => a.area === 'SQL 기본 및 활용')!
    const me = area.bySpeaker.find(s => s.speaker === '나')!
    expect(me.total).toBe(2)
    expect(me.잘함).toBe(1)
    expect(me.masteredPct).toBe(50)
  })

  it('takes the latest session understanding for the same problem', () => {
    const out = computeSyllabusProgress([
      rec({ sessionDate: '2026-06-01', problemNumber: 1, understanding: '모름' }),
      rec({ sessionDate: '2026-06-05', problemNumber: 1, understanding: '잘함' }),
    ])
    const me = out[0].bySpeaker.find(s => s.speaker === '나')!
    expect(me.total).toBe(1)
    expect(me.잘함).toBe(1)
  })

  it('omits areas with no data', () => {
    const out = computeSyllabusProgress([rec({ syllabusArea: 'SQL 기본 및 활용' })])
    expect(out.some(a => a.area === '데이터 모델링의 이해')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- syllabus`
Expected: FAIL (`Cannot find module './syllabus'`).

- [ ] **Step 3: Write `lib/insights/syllabus.ts`**

```ts
import type { ExplanationRecord } from './types'
import { byDateAsc, problemKey } from './helpers'
import { SYLLABUS_AREAS, UNCLASSIFIED, type Understanding } from '@/lib/types'

export interface SpeakerCounts {
  speaker: string
  잘함: number
  애매: number
  모름: number
  total: number
  masteredPct: number
}

export interface AreaProgress {
  area: string
  bySpeaker: SpeakerCounts[]
}

export function computeSyllabusProgress(records: ExplanationRecord[]): AreaProgress[] {
  // latest understanding per (speaker, problem)
  const latest = new Map<string, { area: string; understanding: Understanding }>()
  for (const r of byDateAsc(records)) {
    latest.set(`${r.speaker}::${problemKey(r)}`, { area: r.syllabusArea, understanding: r.understanding })
  }

  const speakers = [...new Set(records.map(r => r.speaker))].sort()
  const areas = [...SYLLABUS_AREAS, UNCLASSIFIED]

  return areas
    .map(area => {
      const bySpeaker: SpeakerCounts[] = speakers.map(speaker => {
        const counts: Record<Understanding, number> = { 잘함: 0, 애매: 0, 모름: 0 }
        for (const [key, v] of latest) {
          if (!key.startsWith(`${speaker}::`)) continue
          if (v.area !== area) continue
          counts[v.understanding]++
        }
        const total = counts.잘함 + counts.애매 + counts.모름
        return {
          speaker,
          잘함: counts.잘함,
          애매: counts.애매,
          모름: counts.모름,
          total,
          masteredPct: total === 0 ? 0 : Math.round((counts.잘함 / total) * 100),
        }
      })
      return { area, bySpeaker }
    })
    .filter(a => a.bySpeaker.some(s => s.total > 0))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- syllabus`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/insights/syllabus.ts lib/insights/syllabus.test.ts && git commit -m "feat: add syllabus area progress computation"
```

---

## Phase 3 — Database

### Task 10: Drizzle schema + migration

**Files:**
- Create: `lib/db/schema.ts`, `drizzle.config.ts`
- Generates: `drizzle/*.sql`

- [ ] **Step 1: Write `lib/db/schema.ts`**

```ts
import { pgTable, uuid, text, integer, date, timestamp, jsonb, unique } from 'drizzle-orm/pg-core'

export const problems = pgTable(
  'problems',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    book: text('book').notNull(),
    chapter: integer('chapter').notNull().default(0),
    problemNumber: integer('problem_number').notNull(),
    problemText: text('problem_text').notNull(),
    solutionText: text('solution_text').notNull(),
    syllabusArea: text('syllabus_area').notNull(),
    concepts: jsonb('concepts').$type<string[]>().notNull().default([]),
  },
  t => ({ uq: unique('problems_book_chapter_number').on(t.book, t.chapter, t.problemNumber) }),
)

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionDate: date('session_date').notNull(),
  book: text('book').notNull(),
  speakers: jsonb('speakers').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const explanations = pgTable('explanations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  speaker: text('speaker').notNull(),
  transcript: text('transcript').notNull(),
  understanding: text('understanding').notNull(),
  conceptsCovered: jsonb('concepts_covered').$type<string[]>().notNull().default([]),
  conceptsMissed: jsonb('concepts_missed').$type<string[]>().notNull().default([]),
  errors: jsonb('errors').$type<string[]>().notNull().default([]),
  feedback: text('feedback').notNull().default(''),
})
```

- [ ] **Step 2: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/sqlp' },
})
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new file `drizzle/0000_*.sql` containing `CREATE TABLE` statements for all three tables.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle.config.ts drizzle/ && git commit -m "feat: add Drizzle schema and initial migration"
```

---

### Task 11: DB connection + PGlite test helper

**Files:**
- Create: `lib/db/index.ts`, `test/helpers/testDb.ts`

- [ ] **Step 1: Write `lib/db/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from './schema'

export type DB = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>

let _db: PostgresJsDatabase<typeof schema> | undefined

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _db = drizzle(postgres(url), { schema })
  }
  return _db
}
```

- [ ] **Step 2: Write `test/helpers/testDb.ts`**

```ts
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/lib/db/schema'

export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  return db
}
```

- [ ] **Step 3: Verify the test DB builds (temporary sanity test)**

Create `test/helpers/testDb.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createTestDb } from './testDb'
import { sessions } from '@/lib/db/schema'

describe('test db', () => {
  it('migrates and accepts an insert', async () => {
    const db = await createTestDb()
    await db.insert(sessions).values({ sessionDate: '2026-06-04', book: 'A', speakers: ['나'] })
    const rows = await db.select().from(sessions)
    expect(rows).toHaveLength(1)
  })
})
```

Run: `npm test -- testDb`
Expected: PASS (1 test). If migration fails, confirm Task 10 Step 3 generated `drizzle/0000_*.sql`.

- [ ] **Step 4: Commit**

```bash
git add lib/db/index.ts test/helpers/ && git commit -m "feat: add db connection and PGlite test helper"
```

---

### Task 12: `ingestSession` query

**Files:**
- Create: `lib/db/queries.ts`
- Test: `lib/db/queries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { createTestDb } from '@/test/helpers/testDb'
import { ingestSession, getAllRecords } from './queries'
import { problems, explanations } from './schema'
import type { SessionInput } from '@/lib/types'

const session: SessionInput = {
  session_date: '2026-06-04', book: '문제집A', speakers: ['나', '민수'],
  problems: [{
    problem_number: 5, chapter: 0, problem_text: 'p', solution_text: 's',
    syllabus_area: 'SQL 고급 활용 및 튜닝', concepts: ['인덱스'],
    explanations: [
      { speaker: '나', transcript: 't1', understanding: '애매', concepts_covered: ['인덱스'], concepts_missed: [], errors: [], feedback: 'f1' },
      { speaker: '민수', transcript: 't2', understanding: '잘함', concepts_covered: ['인덱스'], concepts_missed: [], errors: [], feedback: 'f2' },
    ],
  }],
}

describe('ingestSession', () => {
  it('inserts session, problem, and explanations', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    expect(await db.select().from(problems)).toHaveLength(1)
    expect(await db.select().from(explanations)).toHaveLength(2)
  })

  it('dedups the same problem across sessions and keeps both explanation rows', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    await ingestSession(db, { ...session, session_date: '2026-06-06' })
    expect(await db.select().from(problems)).toHaveLength(1)
    expect(await db.select().from(explanations)).toHaveLength(4)
  })

  it('exposes rows via getAllRecords with problem concepts joined', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    const records = await getAllRecords(db)
    expect(records).toHaveLength(2)
    expect(records[0].problemConcepts).toEqual(['인덱스'])
    expect(records[0].syllabusArea).toBe('SQL 고급 활용 및 튜닝')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- queries`
Expected: FAIL (`Cannot find module './queries'`).

- [ ] **Step 3: Write `lib/db/queries.ts`**

```ts
import { and, eq } from 'drizzle-orm'
import type { DB } from './index'
import { problems, sessions, explanations } from './schema'
import type { SessionInput, Understanding } from '@/lib/types'
import type { ExplanationRecord } from '@/lib/insights/types'

export async function ingestSession(db: DB, input: SessionInput): Promise<{ sessionId: string }> {
  return await db.transaction(async tx => {
    const [session] = await tx
      .insert(sessions)
      .values({ sessionDate: input.session_date, book: input.book, speakers: input.speakers })
      .returning({ id: sessions.id })

    for (const p of input.problems) {
      const existing = await tx
        .select({ id: problems.id })
        .from(problems)
        .where(and(eq(problems.book, input.book), eq(problems.chapter, p.chapter), eq(problems.problemNumber, p.problem_number)))
        .limit(1)

      let problemId: string
      if (existing.length > 0) {
        problemId = existing[0].id
        await tx
          .update(problems)
          .set({ problemText: p.problem_text, solutionText: p.solution_text, syllabusArea: p.syllabus_area, concepts: p.concepts })
          .where(eq(problems.id, problemId))
      } else {
        const [created] = await tx
          .insert(problems)
          .values({
            book: input.book, chapter: p.chapter, problemNumber: p.problem_number,
            problemText: p.problem_text, solutionText: p.solution_text,
            syllabusArea: p.syllabus_area, concepts: p.concepts,
          })
          .returning({ id: problems.id })
        problemId = created.id
      }

      for (const e of p.explanations) {
        await tx.insert(explanations).values({
          sessionId: session.id, problemId, speaker: e.speaker, transcript: e.transcript,
          understanding: e.understanding, conceptsCovered: e.concepts_covered,
          conceptsMissed: e.concepts_missed, errors: e.errors, feedback: e.feedback,
        })
      }
    }
    return { sessionId: session.id }
  })
}

export async function getAllRecords(db: DB): Promise<ExplanationRecord[]> {
  const rows = await db
    .select({
      sessionDate: sessions.sessionDate,
      book: problems.book,
      problemNumber: problems.problemNumber,
      chapter: problems.chapter,
      syllabusArea: problems.syllabusArea,
      problemConcepts: problems.concepts,
      speaker: explanations.speaker,
      understanding: explanations.understanding,
      conceptsCovered: explanations.conceptsCovered,
      conceptsMissed: explanations.conceptsMissed,
      errors: explanations.errors,
      feedback: explanations.feedback,
      transcript: explanations.transcript,
    })
    .from(explanations)
    .innerJoin(sessions, eq(explanations.sessionId, sessions.id))
    .innerJoin(problems, eq(explanations.problemId, problems.id))

  return rows.map(r => ({ ...r, understanding: r.understanding as Understanding }))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- queries`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/db/queries.ts lib/db/queries.test.ts && git commit -m "feat: add ingestSession and getAllRecords"
```

---

### Task 13: `getProblemsWithExplanations` query

**Files:**
- Modify: `lib/db/queries.ts`
- Modify: `lib/db/queries.test.ts`

- [ ] **Step 1: Add the failing test (append to `lib/db/queries.test.ts`)**

```ts
import { getProblemsWithExplanations } from './queries'

describe('getProblemsWithExplanations', () => {
  it('groups explanations under their problem with text and solution', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    const out = await getProblemsWithExplanations(db)
    expect(out).toHaveLength(1)
    expect(out[0].problemText).toBe('p')
    expect(out[0].solutionText).toBe('s')
    expect(out[0].explanations).toHaveLength(2)
    expect(out[0].explanations[0].sessionDate).toBe('2026-06-04')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- queries`
Expected: FAIL (`getProblemsWithExplanations is not a function`).

- [ ] **Step 3: Append the type and function to `lib/db/queries.ts`**

```ts
export interface ProblemDetail {
  id: string
  book: string
  chapter: number
  problemNumber: number
  problemText: string
  solutionText: string
  syllabusArea: string
  concepts: string[]
  explanations: {
    speaker: string
    transcript: string
    understanding: Understanding
    conceptsMissed: string[]
    feedback: string
    sessionDate: string
  }[]
}

export async function getProblemsWithExplanations(db: DB): Promise<ProblemDetail[]> {
  const rows = await db
    .select({
      id: problems.id,
      book: problems.book,
      chapter: problems.chapter,
      problemNumber: problems.problemNumber,
      problemText: problems.problemText,
      solutionText: problems.solutionText,
      syllabusArea: problems.syllabusArea,
      concepts: problems.concepts,
      speaker: explanations.speaker,
      transcript: explanations.transcript,
      understanding: explanations.understanding,
      conceptsMissed: explanations.conceptsMissed,
      feedback: explanations.feedback,
      sessionDate: sessions.sessionDate,
    })
    .from(problems)
    .innerJoin(explanations, eq(explanations.problemId, problems.id))
    .innerJoin(sessions, eq(explanations.sessionId, sessions.id))

  const byId = new Map<string, ProblemDetail>()
  for (const r of rows) {
    if (!byId.has(r.id)) {
      byId.set(r.id, {
        id: r.id, book: r.book, chapter: r.chapter, problemNumber: r.problemNumber,
        problemText: r.problemText, solutionText: r.solutionText,
        syllabusArea: r.syllabusArea, concepts: r.concepts, explanations: [],
      })
    }
    byId.get(r.id)!.explanations.push({
      speaker: r.speaker, transcript: r.transcript,
      understanding: r.understanding as Understanding,
      conceptsMissed: r.conceptsMissed, feedback: r.feedback, sessionDate: r.sessionDate,
    })
  }
  return [...byId.values()].sort((a, b) =>
    a.book === b.book ? a.chapter - b.chapter || a.problemNumber - b.problemNumber : a.book < b.book ? -1 : 1,
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- queries`
Expected: PASS (4 tests total).

- [ ] **Step 5: Commit**

```bash
git add lib/db/queries.ts lib/db/queries.test.ts && git commit -m "feat: add getProblemsWithExplanations"
```

---

## Phase 4 — API Routes

### Task 14: `POST /api/sessions` (validate + ingest)

**Files:**
- Create: `app/api/sessions/route.ts`

- [ ] **Step 1: Write `app/api/sessions/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { validate } from '@/lib/ingest/validate'
import { getDb } from '@/lib/db'
import { ingestSession } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON 파싱 실패: 올바른 JSON이 아닙니다.' }, { status: 400 })
  }

  const result = validate(raw)
  if (!result.ok || !result.session) {
    return NextResponse.json({ error: result.fatalError ?? '검증 실패' }, { status: 400 })
  }
  if (result.session.problems.length === 0) {
    return NextResponse.json({ error: '저장할 수 있는 문제가 없습니다.', warnings: result.warnings }, { status: 400 })
  }

  await ingestSession(getDb(), result.session)
  return NextResponse.json({
    ok: true,
    problemCount: result.problemCount,
    explanationCount: result.explanationCount,
    warnings: result.warnings,
  })
}
```

- [ ] **Step 2: Manual verification**

Start a local Postgres and set `DATABASE_URL` in `.env.local`, run `npm run db:push`, then `npm run dev`, then:

```bash
curl -s -X POST http://localhost:3000/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"session_date":"2026-06-04","book":"문제집A","speakers":["나"],"problems":[{"problem_number":5,"problem_text":"p","solution_text":"s","syllabus_area":"SQL 기본 및 활용","concepts":["인덱스"],"explanations":[{"speaker":"나","transcript":"t","understanding":"애매"}]}]}'
```

Expected: `{"ok":true,"problemCount":1,"explanationCount":1,"warnings":[]}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/sessions/route.ts && git commit -m "feat: add POST /api/sessions ingest route"
```

---

### Task 15: `GET /api/data` (records + problems)

**Files:**
- Create: `app/api/data/route.ts`

- [ ] **Step 1: Write `app/api/data/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAllRecords, getProblemsWithExplanations } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  const [records, problems] = await Promise.all([getAllRecords(db), getProblemsWithExplanations(db)])
  return NextResponse.json({ records, problems })
}
```

- [ ] **Step 2: Manual verification**

With the dev server running and Task 14 data ingested:

```bash
curl -s http://localhost:3000/api/data | head -c 400
```

Expected: JSON containing `"records"` and `"problems"` arrays with the ingested row.

- [ ] **Step 3: Commit**

```bash
git add app/api/data/route.ts && git commit -m "feat: add GET /api/data route"
```

---

## Phase 5 — Auth

### Task 16: Shared-password gate

**Files:**
- Create: `lib/auth.ts`, `app/api/login/route.ts`, `app/login/page.tsx`, `middleware.ts`
- Test: `lib/auth.test.ts`

- [ ] **Step 1: Write the failing test for the token helper**

```ts
import { describe, it, expect } from 'vitest'
import { computeToken } from './auth'

describe('computeToken', () => {
  it('is deterministic for the same secret', async () => {
    const a = await computeToken('secret-123')
    const b = await computeToken('secret-123')
    expect(a).toBe(b)
  })

  it('differs for different secrets', async () => {
    expect(await computeToken('a')).not.toBe(await computeToken('b'))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- auth`
Expected: FAIL (`Cannot find module './auth'`).

- [ ] **Step 3: Write `lib/auth.ts` (edge-compatible Web Crypto)**

```ts
export const AUTH_COOKIE = 'sqlp_auth'

export async function computeToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`sqlp::${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- auth`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `app/api/login/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { AUTH_COOKIE, computeToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  if (!password || password !== process.env.SHARED_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
  }
  const token = await computeToken(process.env.AUTH_SECRET ?? '')
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
```

- [ ] **Step 6: Write `app/login/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) router.push('/')
    else setError((await res.json()).error ?? '로그인 실패')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-lg font-semibold">SQLP 스터디</h1>
        <p className="mb-4 text-sm text-muted-foreground">공유 비밀번호를 입력하세요.</p>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" autoFocus />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">로그인</Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Write `middleware.ts`**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, computeToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  const expected = await computeToken(process.env.AUTH_SECRET ?? '')
  if (token !== expected) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  // protect everything except the login page, the login API, and static assets
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 8: Manual verification**

`npm run dev`, open `http://localhost:3000` → redirected to `/login`. Enter the `SHARED_PASSWORD` from `.env.local` → lands on home. Wrong password → error message.

- [ ] **Step 9: Commit**

```bash
git add lib/auth.ts lib/auth.test.ts app/api/login app/login middleware.ts && git commit -m "feat: add shared-password auth gate"
```

---

## Phase 6 — UI Screens

### Task 17: Dashboard shell + shared data hook + status colors

**Files:**
- Create: `app/(dashboard)/layout.tsx`, `components/sidebar.tsx`, `lib/client/useData.ts`, `lib/client/status.ts`

- [ ] **Step 1: Write `lib/client/status.ts` (shared color map)**

```ts
import type { Status } from '@/lib/insights/types'

export const STATUS_BG: Record<Status, string> = {
  잘함: 'bg-emerald-500',
  애매: 'bg-amber-400',
  모름: 'bg-red-500',
  미학습: 'bg-muted',
}

export const STATUS_TEXT: Record<Status, string> = {
  잘함: 'text-emerald-700',
  애매: 'text-amber-700',
  모름: 'text-red-700',
  미학습: 'text-muted-foreground',
}
```

- [ ] **Step 2: Write `lib/client/useData.ts`**

```ts
'use client'
import { useEffect, useState } from 'react'
import type { ExplanationRecord } from '@/lib/insights/types'
import type { ProblemDetail } from '@/lib/db/queries'

export interface AppData {
  records: ExplanationRecord[]
  problems: ProblemDetail[]
}

export function useData() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('데이터 로드 실패'))))
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  return { data, error, loading: !data && !error }
}
```

- [ ] **Step 3: Write `components/sidebar.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Flame, Handshake, Calendar, BookOpen, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: '홈', icon: Home },
  { href: '/weakness', label: '약점맵', icon: Flame },
  { href: '/pair-queue', label: '페어큐', icon: Handshake },
  { href: '/sessions', label: '세션', icon: Calendar },
  { href: '/review', label: '문제복습', icon: BookOpen },
  { href: '/upload', label: '업로드', icon: Upload },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-52 shrink-0 border-r bg-muted/20 p-3">
      <div className="mb-4 px-2 text-sm font-semibold">SQLP 스터디</div>
      <nav className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:bg-background/60',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 4: Write `app/(dashboard)/layout.tsx`**

```tsx
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 5: Verify**

`npm run dev`, log in, confirm the sidebar renders with six links and active highlighting changes as you click (pages may 404 until built — that is expected).

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/layout.tsx" components/sidebar.tsx lib/client/ && git commit -m "feat: add dashboard shell, data hook, status colors"
```

---

### Task 18: Upload page (priority 1)

**Files:**
- Create: `app/(dashboard)/upload/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/upload/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { validate, type ValidationResult } from '@/lib/ingest/validate'

export default function UploadPage() {
  const [raw, setRaw] = useState<unknown>(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<ValidationResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setSaved(null); setError(null)
    try {
      const json = JSON.parse(await file.text())
      setRaw(json); setFileName(file.name); setPreview(validate(json))
    } catch {
      setPreview(null); setError('JSON 파싱 실패: 올바른 JSON 파일이 아닙니다.')
    }
  }

  async function confirm() {
    if (!raw) return
    setSaving(true); setError(null)
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw),
    })
    setSaving(false)
    const body = await res.json()
    if (res.ok) { setSaved(`저장 완료: 문제 ${body.problemCount}개 / 발화 ${body.explanationCount}개`); setPreview(null); setRaw(null) }
    else setError(body.error ?? '저장 실패')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">세션 업로드</h1>
      <Card
        className="flex h-32 cursor-pointer items-center justify-center border-dashed text-sm text-muted-foreground"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {fileName || 'JSON 파일을 드롭하거나 클릭해서 선택'}
        <input id="file-input" type="file" accept="application/json,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">{saved}</p>}

      {preview?.fatalError && <Card className="p-4 text-sm text-red-600">형식 오류: {preview.fatalError}</Card>}

      {preview?.ok && preview.session && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge>{preview.session.session_date}</Badge>
            <Badge variant="secondary">{preview.session.book}</Badge>
            <span className="text-muted-foreground">문제 {preview.problemCount} · 발화 {preview.explanationCount}</span>
          </div>
          {preview.warnings.length > 0 && (
            <ul className="space-y-1 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              {preview.warnings.map((w, i) => (
                <li key={i}>⚠️ {w.problemNumber != null ? `${w.problemNumber}번: ` : ''}{w.message}</li>
              ))}
            </ul>
          )}
          <Button onClick={confirm} disabled={saving || preview.problemCount === 0}>
            {saving ? '저장 중…' : '확정 저장'}
          </Button>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`npm run dev`, go to `/upload`, drop the sample file (Task 24). Confirm preview shows counts + any warnings, then "확정 저장" returns the success line.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/upload/page.tsx" && git commit -m "feat: add upload page with validation preview"
```

---

### Task 19: Weakness heatmap page (priority 2/3)

**Files:**
- Create: `app/(dashboard)/weakness/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/weakness/page.tsx`**

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/client/useData'
import { computeWeaknessMap } from '@/lib/insights/weakness'
import { STATUS_BG } from '@/lib/client/status'
import { SYLLABUS_AREAS, UNCLASSIFIED } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

const AREAS = ['전체', ...SYLLABUS_AREAS, UNCLASSIFIED]

export default function WeaknessPage() {
  const { data, loading, error } = useData()
  const [area, setArea] = useState('전체')

  const map = useMemo(() => (data ? computeWeaknessMap(data.records) : null), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!map || map.concepts.length === 0) return <p className="text-sm text-muted-foreground">아직 데이터가 없습니다. 세션을 업로드하세요.</p>

  const concepts = area === '전체'
    ? map.concepts
    : map.concepts.filter(c => map.cells.some(x => x.concept === c && x.syllabusArea === area))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">약점 히트맵</h1>
      <div className="flex flex-wrap gap-1">
        {AREAS.map(a => (
          <Badge key={a} variant={a === area ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setArea(a)}>{a}</Badge>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-emerald-500" />잘함</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-amber-400" />애매</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-red-500" />모름</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-muted" />미학습</span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-40" />
              {map.speakers.map(s => <th key={s} className="px-2 text-sm font-medium">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {concepts.map(concept => (
              <tr key={concept}>
                <td className="pr-2 text-right text-sm text-muted-foreground">{concept}</td>
                {map.speakers.map(s => {
                  const cell = map.cells.find(x => x.speaker === s && x.concept === concept)!
                  return <td key={s} title={`${s} · ${concept}: ${cell.status}`} className={`h-7 w-16 rounded ${STATUS_BG[cell.status]}`} />
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/weakness` shows a concept × speaker grid colored by status; the area badges filter rows.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/weakness/page.tsx" && git commit -m "feat: add weakness heatmap page"
```

---

### Task 20: Pair queue page (priority 4)

**Files:**
- Create: `app/(dashboard)/pair-queue/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/pair-queue/page.tsx`**

```tsx
'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/client/useData'
import { computePairQueue, type PairQueueItem } from '@/lib/insights/pairQueue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function problemLabel(p: { book: string; chapter: number; problemNumber: number }) {
  return `${p.book} ${p.chapter > 0 ? `${p.chapter}장 ` : ''}${p.problemNumber}번`
}

function Section({ title, hint, items }: { title: string; hint: string; items: PairQueueItem[] }) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">없음 🎉</p> : (
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.concept} className="rounded-md border p-2 text-sm">
              <div className="font-medium">{i.concept}</div>
              {i.kind === 'teach' && <div className="text-xs text-muted-foreground">{i.teacher} → {i.learner} 가르치기</div>}
              <div className="mt-1 flex flex-wrap gap-1">
                {i.relatedProblems.map((p, idx) => <Badge key={idx} variant="outline">{problemLabel(p)}</Badge>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function PairQueuePage() {
  const { data, loading, error } = useData()
  const queue = useMemo(() => (data ? computePairQueue(data.records) : []), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const teach = queue.filter(i => i.kind === 'teach')
  const both = queue.filter(i => i.kind === 'both_unknown')
  const speakers = [...new Set(data!.records.map(r => r.speaker))]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">페어 학습 큐</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {speakers.map(s => (
          <Section key={s} title={`${s}가 가르치기`} hint={`${s}는 잘함, 상대는 모름`} items={teach.filter(i => i.teacher === s)} />
        ))}
        <Section title="🔴 둘 다 모름" hint="PDF 다시 읽어야 할 개념" items={both} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/pair-queue` shows teach sections per speaker plus a "둘 다 모름" section, each listing concepts and related problem badges.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/pair-queue/page.tsx" && git commit -m "feat: add pair queue page"
```

---

### Task 21: Problem review page (priority 2)

**Files:**
- Create: `app/(dashboard)/review/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/review/page.tsx`**

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/client/useData'
import type { ProblemDetail } from '@/lib/db/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_TEXT } from '@/lib/client/status'

function label(p: ProblemDetail) {
  return `${p.book} ${p.chapter > 0 ? `${p.chapter}장 ` : ''}${p.problemNumber}번`
}

export default function ReviewPage() {
  const { data, loading, error } = useData()
  const [onlyUnknown, setOnlyUnknown] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const problems = useMemo(() => {
    if (!data) return []
    return onlyUnknown
      ? data.problems.filter(p => p.explanations.some(e => e.understanding === '모름'))
      : data.problems
  }, [data, onlyUnknown])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const selected = problems.find(p => p.id === selectedId) ?? problems[0]

  return (
    <div className="flex gap-4">
      <div className="w-56 shrink-0 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyUnknown} onChange={e => setOnlyUnknown(e.target.checked)} />
          모름만 보기
        </label>
        <div className="space-y-1">
          {problems.map(p => (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              className={`block w-full rounded-md px-2 py-1 text-left text-sm ${selected?.id === p.id ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}>
              {label(p)}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Badge>{label(selected)}</Badge>
              <Badge variant="secondary">{selected.syllabusArea}</Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium">문제</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.problemText}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">해설</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.solutionText}</p>
            </div>
          </Card>

          <div className="space-y-3">
            {selected.explanations.map((e, i) => (
              <Card key={i} className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{e.speaker}</span>
                  <span className={STATUS_TEXT[e.understanding]}>{e.understanding}</span>
                  <span className="text-xs text-muted-foreground">{e.sessionDate}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{e.transcript}</p>
                {e.conceptsMissed.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.conceptsMissed.map((c, j) => <Badge key={j} variant="outline" className="text-red-600">놓침: {c}</Badge>)}
                  </div>
                )}
                {e.feedback && <p className="rounded bg-muted/50 p-2 text-xs">{e.feedback}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/review` lists problems on the left; selecting one shows problem+solution on the left card and per-speaker explanations with status/feedback on the right. "모름만 보기" filters the list.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/review/page.tsx" && git commit -m "feat: add problem review page"
```

---

### Task 22: Sessions timeline page (priority 5)

**Files:**
- Create: `app/(dashboard)/sessions/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/sessions/page.tsx`**

```tsx
'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/client/useData'
import type { ExplanationRecord } from '@/lib/insights/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_TEXT } from '@/lib/client/status'

interface SessionGroup {
  date: string
  book: string
  problemCount: number
  bySpeaker: { speaker: string; 잘함: number; 애매: number; 모름: number }[]
}

function groupSessions(records: ExplanationRecord[]): SessionGroup[] {
  const byDate = new Map<string, ExplanationRecord[]>()
  for (const r of records) {
    const key = `${r.sessionDate}__${r.book}`
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(r)
  }
  return [...byDate.entries()]
    .map(([key, rs]) => {
      const [date, book] = key.split('__')
      const speakers = [...new Set(rs.map(r => r.speaker))].sort()
      const problemCount = new Set(rs.map(r => `${r.chapter}-${r.problemNumber}`)).size
      const bySpeaker = speakers.map(s => {
        const mine = rs.filter(r => r.speaker === s)
        return {
          speaker: s,
          잘함: mine.filter(r => r.understanding === '잘함').length,
          애매: mine.filter(r => r.understanding === '애매').length,
          모름: mine.filter(r => r.understanding === '모름').length,
        }
      })
      return { date, book, problemCount, bySpeaker }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export default function SessionsPage() {
  const { data, loading, error } = useData()
  const groups = useMemo(() => (data ? groupSessions(data.records) : []), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">아직 세션이 없습니다.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">세션 타임라인</h1>
      <div className="space-y-2">
        {groups.map(g => (
          <Card key={`${g.date}-${g.book}`} className="flex flex-wrap items-center gap-3 p-4">
            <Badge>{g.date}</Badge>
            <Badge variant="secondary">{g.book}</Badge>
            <span className="text-sm text-muted-foreground">문제 {g.problemCount}개</span>
            <div className="ml-auto flex flex-wrap gap-3 text-sm">
              {g.bySpeaker.map(s => (
                <span key={s.speaker}>
                  <span className="font-medium">{s.speaker}</span>{' '}
                  <span className={STATUS_TEXT.잘함}>{s.잘함}</span>/
                  <span className={STATUS_TEXT.애매}>{s.애매}</span>/
                  <span className={STATUS_TEXT.모름}>{s.모름}</span>
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/sessions` lists each date+book with problem count and per-speaker 잘함/애매/모름 tallies, newest first.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/sessions/page.tsx" && git commit -m "feat: add sessions timeline page"
```

---

### Task 23: Home overview page (priority 6)

**Files:**
- Create: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/page.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { useData } from '@/lib/client/useData'
import { computeSyllabusProgress } from '@/lib/insights/syllabus'
import { computePairQueue } from '@/lib/insights/pairQueue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  const { data, loading, error } = useData()
  const progress = useMemo(() => (data ? computeSyllabusProgress(data.records) : []), [data])
  const queueCount = useMemo(() => (data ? computePairQueue(data.records).length : 0), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data || data.records.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">홈</h1>
        <p className="text-sm text-muted-foreground">아직 데이터가 없습니다. <Link href="/upload" className="underline">세션 업로드</Link>로 시작하세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">홈</h1>

      <Link href="/pair-queue">
        <Card className="flex items-center justify-between p-4 hover:bg-muted/40">
          <span className="text-sm">오늘의 페어 학습 큐</span>
          <Badge>{queueCount}개</Badge>
        </Card>
      </Link>

      <div className="grid gap-4 md:grid-cols-3">
        {progress.map(area => (
          <Card key={area.area} className="space-y-3 p-4">
            <h2 className="text-sm font-medium">{area.area}</h2>
            {area.bySpeaker.map(s => (
              <div key={s.speaker} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{s.speaker}</span><span>{s.masteredPct}% ({s.잘함}/{s.total})</span>
                </div>
                <div className="h-2 w-full rounded bg-muted">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${s.masteredPct}%` }} />
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/` shows the pair-queue banner (links to `/pair-queue`) and one progress card per area with per-speaker mastered bars.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/page.tsx" && git commit -m "feat: add home overview page"
```

---

## Phase 7 — Fixtures, Full-Suite, Docs

### Task 24: Sample fixtures + run instructions

**Files:**
- Create: `fixtures/session-sample-1.json`, `fixtures/session-sample-2.json`, `README.md`

- [ ] **Step 1: Write `fixtures/session-sample-1.json`**

```json
{
  "session_date": "2026-06-04",
  "book": "문제집A",
  "speakers": ["나", "민수"],
  "problems": [
    {
      "problem_number": 5,
      "chapter": 2,
      "problem_text": "다음 SQL의 실행계획에서 인덱스가 사용되지 않는 이유는?",
      "solution_text": "선택성이 낮아 옵티마이저가 풀스캔을 택함. 통계 정보와 히스토그램을 함께 고려.",
      "syllabus_area": "SQL 고급 활용 및 튜닝",
      "concepts": ["인덱스 선택성", "옵티마이저 통계", "히스토그램"],
      "explanations": [
        {
          "speaker": "나",
          "transcript": "선택성이 낮아서 인덱스를 안 타는 것 같아요.",
          "understanding": "애매",
          "concepts_covered": ["인덱스 선택성"],
          "concepts_missed": ["옵티마이저 통계", "히스토그램"],
          "errors": ["풀스캔이 항상 느리다고 잘못 말함"],
          "feedback": "선택성은 맞았으나 통계/히스토그램 언급 누락"
        },
        {
          "speaker": "민수",
          "transcript": "선택성, 통계, 히스토그램까지 고려해야 합니다.",
          "understanding": "잘함",
          "concepts_covered": ["인덱스 선택성", "옵티마이저 통계", "히스토그램"],
          "concepts_missed": [],
          "errors": [],
          "feedback": "핵심 모두 짚음"
        }
      ]
    },
    {
      "problem_number": 6,
      "chapter": 2,
      "problem_text": "정규화 3NF의 정의는?",
      "solution_text": "이행적 함수 종속을 제거한 상태.",
      "syllabus_area": "데이터 모델링의 이해",
      "concepts": ["정규화", "이행적 종속"],
      "explanations": [
        {
          "speaker": "나",
          "transcript": "이행적 종속을 없앤 거요.",
          "understanding": "잘함",
          "concepts_covered": ["정규화", "이행적 종속"],
          "concepts_missed": [],
          "errors": [],
          "feedback": "정확"
        },
        {
          "speaker": "민수",
          "transcript": "잘 기억이 안 나요.",
          "understanding": "모름",
          "concepts_covered": [],
          "concepts_missed": ["정규화", "이행적 종속"],
          "errors": [],
          "feedback": "복습 필요"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Write `fixtures/session-sample-2.json`** (later date — proves time-ordering; includes one unknown area to exercise the 미분류 warning)

```json
{
  "session_date": "2026-06-09",
  "book": "문제집A",
  "speakers": ["나", "민수"],
  "problems": [
    {
      "problem_number": 5,
      "chapter": 2,
      "problem_text": "다음 SQL의 실행계획에서 인덱스가 사용되지 않는 이유는?",
      "solution_text": "선택성이 낮아 옵티마이저가 풀스캔을 택함.",
      "syllabus_area": "SQL 고급 활용 및 튜닝",
      "concepts": ["인덱스 선택성", "옵티마이저 통계", "히스토그램"],
      "explanations": [
        {
          "speaker": "나",
          "transcript": "이제 통계랑 히스토그램까지 다 설명할 수 있어요.",
          "understanding": "잘함",
          "concepts_covered": ["인덱스 선택성", "옵티마이저 통계", "히스토그램"],
          "concepts_missed": [],
          "errors": [],
          "feedback": "지난주보다 향상"
        }
      ]
    },
    {
      "problem_number": 7,
      "chapter": 3,
      "problem_text": "옵티마이저 힌트 사용 시 주의점은?",
      "solution_text": "힌트는 통계 변화에 취약하므로 남용 금지.",
      "syllabus_area": "옵티마이저",
      "concepts": ["힌트"],
      "explanations": [
        {
          "speaker": "민수",
          "transcript": "힌트는 자주 쓰면 좋아요.",
          "understanding": "모름",
          "concepts_covered": [],
          "concepts_missed": ["힌트"],
          "errors": ["힌트 남용이 좋다고 잘못 말함"],
          "feedback": "오개념 교정 필요"
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Write `README.md`**

````markdown
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
````

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all suites pass (smoke, schema, validate, helpers, weakness, pairQueue, syllabus, auth, testDb, queries).

- [ ] **Step 5: Full manual smoke**

`npm run dev`, log in, upload both fixtures, then visit `/`, `/weakness`, `/pair-queue`, `/review`, `/sessions`. Confirm: 인덱스 selectivity shows 잘함 for 나 in the latest state; pair queue lists 정규화 (민수 모름 / 나 잘함) and 힌트 (둘 다 모름); 옵티마이저 area appears as 미분류 with an upload warning.

- [ ] **Step 6: Remove the temporary testDb sanity test (cleanup)**

```bash
git rm test/helpers/testDb.test.ts && git commit -m "chore: drop temporary test-db sanity test"
```

- [ ] **Step 7: Commit fixtures and docs**

```bash
git add fixtures/ README.md && git commit -m "docs: add sample fixtures and README"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- §3 stack → Tasks 1–2, 10–11, 16. ✓
- §4 JSON contract (full schema, all fields) → Tasks 3–5 (types/Zod/validate); every field persisted in Task 12 and surfaced in Tasks 19–23. ✓
- §4 understanding 3-level + syllabus 3-area enum + 미분류 → Task 3 constants, Task 5 normalization (warning tested), Task 9 areas. ✓
- §5 six screens (priority 1·2·3·4 → 5·6) → Tasks 18, 21, 19, 20, 22, 23 in that priority order. ✓
- §6 DB schema (3 tables, unique key, jsonb) → Task 10. ✓
- §6 same problem across sessions accumulates → Task 12 dedup test. ✓
- §7 directory structure → matches File Structure section. ✓
- §8 validation/error handling (Zod, preview, partial save, unknown area → 미분류, duplicate handling, transaction) → Tasks 5, 12, 14, 18. ✓
- §9 testing (pure-function focus, Zod fixtures, sample data, Vitest) → Tasks 4–9, 24. ✓
- §10 out-of-scope (Anki, sub-categorization, magic-link, error-pattern detection, in-app OCR/LLM) → not implemented; `errors` field still stored (Task 12) for future use. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full code; every test step contains assertions. ✓

**Type consistency:** `ExplanationRecord` (Task 6) reused by all insights and `getAllRecords` (Task 12). `ProblemDetail` defined in Task 13, consumed by `useData` (Task 17) and review page (Task 21). `Status`/`STATUS_BG`/`STATUS_TEXT` consistent across Tasks 6/17/19/21/22. `validate`/`ValidationResult` consistent across Tasks 5/14/18. `computeWeaknessMap`/`computePairQueue`/`computeSyllabusProgress` signatures match call sites. `chapter` is a non-null number (0 = none) consistently from Task 3 through the UI labels. ✓
