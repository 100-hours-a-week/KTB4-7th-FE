# 프론트엔드 초기 환경 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React 기반 프론트엔드와 한글 협업 규칙, PR CI를 갖춘 초기 개발 환경을 만든다.

**Architecture:** Vite가 React 애플리케이션의 개발·빌드 기반을 제공한다. `app`, `pages`, `features`, `entities`, `shared` 구조로 기능 경계를 분리하고, API·전역 상태·폼 검증·테스트 도구를 공통 기반으로 구성한다. GitHub Actions는 `feat/*`에서 `dev`로 향하는 PR만 검증한다.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios, Zustand, React Hook Form, Zod, Vitest, Testing Library, MSW, ESLint, Prettier, Husky, lint-staged, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-16-frontend-bootstrap-design.md`

## Global Constraints

- 사용자 기능 개발은 최신 `dev`에서 만든 `feat/이슈번호-기능명` 브랜치에서만 한다.
- PR 대상은 `dev`이며 `main`으로 직접 PR을 만들지 않는다.
- API 계약은 공식 API 명세를 우선하며 추측으로 API를 추가하지 않는다.
- 실제 비밀값과 `.env` 파일은 추적하지 않는다.
- 모든 규칙 문서와 PR 템플릿 설명은 한글로 작성한다.
- PR 전 `lint`, `test`, `build`를 실제 실행한다.

---

### Task 1: React 프로젝트와 품질 도구 구성

**Files:**

- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/index.css`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**

- Produces: `npm run dev`, `npm run lint`, `npm run test`, `npm run build` 명령
- Produces: 테스트 가능한 기본 `App` 컴포넌트

- [x] **Step 1: 기본 화면의 실패 테스트를 작성한다.**

```tsx
import { render, screen } from '@testing-library/react'
import { App } from './App'

test('서비스 이름을 표시한다', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '맴매' })).toBeInTheDocument()
})
```

- [x] **Step 2: 테스트가 아직 실패하는지 확인한다.**

Run: `npm run test -- --run src/app/App.test.tsx`

Expected: `App` 모듈이 없어 실패한다.

- [x] **Step 3: Vite React TypeScript 프로젝트와 최소 App을 구성한다.**

```tsx
export function App() {
  return (
    <main>
      <h1>맴매</h1>
    </main>
  )
}
```

Vite·TypeScript·Tailwind·ESLint·Prettier·Vitest·Testing Library 의존성과 각각의 설정을 추가한다. `package.json`에는 `dev`, `build`, `lint`, `test`, `format`, `format:check` 스크립트를 정의한다. `.env.example`에는 `VITE_API_BASE_URL=http://localhost:8080`만 둔다.

- [x] **Step 4: 테스트가 통과하는지 확인한다.**

Run: `npm run test -- --run src/app/App.test.tsx`

Expected: 1개 테스트가 통과한다.

- [x] **Step 5: 품질 명령을 검증한다.**

Run: `npm run lint && npm run build`

Expected: 두 명령이 종료 코드 0으로 끝난다.

- [ ] **Step 6: 커밋한다.**

```bash
git add package.json vite.config.ts tsconfig.json src eslint.config.js .prettierrc.json .prettierignore .gitignore .env.example
git commit -m "chore: React 개발 환경 초기화"
```

### Task 2: 앱 공통 기반과 API 경계 구성

**Files:**

- Create: `src/app/providers/AppProviders.tsx`
- Create: `src/app/router.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/shared/api/http.ts`
- Create: `src/shared/config/env.ts`
- Create: `src/shared/store/useUiStore.ts`
- Create: `src/shared/api/http.test.ts`

**Interfaces:**

- Consumes: `VITE_API_BASE_URL`
- Produces: `AppProviders`, `router`, `http`, `useUiStore`

- [x] **Step 1: API 기본 주소의 실패 테스트를 작성한다.**

```ts
import { getApiBaseUrl } from '../config/env'

test('API 기본 주소를 환경변수에서 읽는다', () => {
  expect(getApiBaseUrl({ VITE_API_BASE_URL: 'https://api.example.com' })).toBe(
    'https://api.example.com',
  )
})
```

- [x] **Step 2: 테스트가 아직 실패하는지 확인한다.**

Run: `npm run test -- --run src/shared/api/http.test.ts`

Expected: `getApiBaseUrl` 모듈이 없어 실패한다.

- [x] **Step 3: 앱 Provider, 라우터, API 클라이언트와 최소 상태 저장소를 구현한다.**

```ts
export function getApiBaseUrl(env: { VITE_API_BASE_URL?: string }) {
  return env.VITE_API_BASE_URL ?? ''
}
```

`AppProviders`는 TanStack Query Provider를 제공하고, 라우터는 `/` 경로에서 `HomePage`를 표시한다. `http`는 `getApiBaseUrl(import.meta.env)`를 `baseURL`로 사용한다. Zustand 저장소에는 `isNavigationOpen`, `openNavigation`, `closeNavigation`만 둔다.

- [x] **Step 4: 테스트가 통과하는지 확인한다.**

Run: `npm run test -- --run src/shared/api/http.test.ts`

Expected: 1개 테스트가 통과한다.

- [x] **Step 5: 전체 검증을 실행한다.**

Run: `npm run lint && npm run test -- --run && npm run build`

Expected: 모든 명령이 종료 코드 0으로 끝난다.

- [ ] **Step 6: 커밋한다.**

```bash
git add src
git commit -m "feat: 프론트 공통 앱 기반 구성"
```

### Task 3: LLM 협업 규칙과 PR 자동 검증 구성

**Files:**

- Create: `AGENTS.md`
- Create: `.agents/skills/memme-frontend-development/SKILL.md`
- Create: `.github/pull_request_template.md`
- Create: `.github/workflows/pr-ci.yml`
- Create: `.husky/pre-commit`
- Modify: `package.json`

**Interfaces:**

- Consumes: `npm run lint`, `npm run test -- --run`, `npm run build`
- Produces: `feat/* → dev` PR CI와 커밋 전 검사

- [x] **Step 1: CI 트리거의 실패 검증을 작성한다.**

```bash
test -f .github/workflows/pr-ci.yml
rg -q 'base: dev' .github/workflows/pr-ci.yml
rg -q 'feat/\*' .github/workflows/pr-ci.yml
```

- [x] **Step 2: 검증이 실패하는지 확인한다.**

Run: `test -f .github/workflows/pr-ci.yml`

Expected: 워크플로 파일이 없어 종료 코드 1로 실패한다.

- [x] **Step 3: 한글 협업 문서, PR 템플릿, GitHub Actions와 Git 훅을 구성한다.**

`AGENTS.md`와 스킬에는 Issue 우선, 최신 `dev` 기반 기능 브랜치, 한글 Conventional Commit, `dev` PR, `Closes #이슈번호`, 실제 테스트·빌드, 커밋·푸시·PR 직전 최종 승인 규칙을 작성한다. PR CI는 `pull_request`의 `opened`, `synchronize`, `reopened` 이벤트에서 `base: dev`와 `head: feat/**`일 때 Node 의존성 설치, 린트, 테스트, 빌드를 실행한다. Husky pre-commit은 lint-staged를 실행한다.

- [x] **Step 4: CI 설정 검증이 통과하는지 확인한다.**

Run: `test -f .github/workflows/pr-ci.yml && rg -q 'base: dev' .github/workflows/pr-ci.yml && rg -q 'feat/\*\*' .github/workflows/pr-ci.yml`

Expected: 종료 코드 0으로 끝난다.

- [x] **Step 5: 전체 검증을 실행한다.**

Run: `npm run lint && npm run test -- --run && npm run build`

Expected: 모든 명령이 종료 코드 0으로 끝난다.

- [ ] **Step 6: 커밋한다.**

```bash
git add AGENTS.md .agents .github .husky package.json
git commit -m "chore: 프론트 협업 및 CI 규칙 구성"
```
