# 모바일 앱 목업 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원가입 API 연동을 유지하면서 로그인 이후 매장 운영 목업 화면을 스마트폰 프레임 안에 일관되게 제공한다.

**Architecture:** `AppShell`은 기기 프레임, 고정 헤더·하단 탭, 내부 스크롤 컨테이너만 맡는다. 정적 목업 도메인 데이터는 `entities/dashboard/model`에 둔다. 페이지는 fixture와 재사용 UI를 조합하고 API 호출·세션 저장 없이 화면의 로컬 상호작용만 제공한다.

**Tech Stack:** React 19, TypeScript, React Router, Vite, Tailwind CSS import, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-22-mobile-app-mockups-design.md`

## Global Constraints

- `/signup`의 API 주소, 요청·응답 타입, `Signup-Token` 헤더, 오류 처리와 단계 전환은 변경하지 않는다.
- 로그인·알림·프로필·매출 업로드·분석은 네트워크 요청 없이 fixture와 로컬 상태만 사용한다.
- PC 폭 431px 이상에서는 폭 430px의 기기 프레임 안에서 `.app-content`만 스크롤한다.
- 모바일 폭에서는 기기 프레임과 외부 배경을 제거하고 화면 전체를 앱으로 사용한다.
- 새 버튼은 최소 44px 높이와 접근 가능한 이름을 갖는다.

## Review Focus

- PC에서 헤더·하단 탭이 브라우저가 아니라 기기 프레임 내부에 고정되는지 검증한다.
- 모바일에서 기기 프레임 테두리가 사라져 콘텐츠 폭과 입력 폼이 잘리지 않는지 검증한다.
- 회원가입 첫 단계에서 서버가 돌려준 필드 오류가 해당 입력 아래에 계속 노출되는지 검증한다.
- 매출 업로드에서 지원하지 않는 확장자 파일을 선택했을 때 업로드 완료 상태가 되지 않는지 검증한다.
- fixture가 비어 있을 때 솔루션·저장함·알림 페이지가 빈 상태와 다음 행동을 제공하는지 검증한다.

---

### Task 1: 앱 프레임과 공통 탐색 재구성

**Files:**

- Modify: `src/shared/ui/AppShell.tsx`
- Modify: `src/shared/ui/AppShell.test.tsx`
- Modify: `src/index.css`

**Interfaces:**

- Consumes: `title: string`, `children: ReactNode`
- Produces: 기기 프레임 내부의 `mobile-app-header`, 스크롤 가능한 `app-content`, `bottom-tabs`

- [ ] **Step 1: 실패하는 프레임 구조 테스트를 작성한다**

```tsx
test('기기 프레임 안에 스크롤 본문과 주요 하단 탐색을 렌더링한다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )
  expect(screen.getByRole('main')).toHaveClass('app-content')
  expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute(
    'href',
    '/notifications',
  )
})
```

- [ ] **Step 2: 테스트가 실패함을 확인한다**

Run: `npm run test -- --run src/shared/ui/AppShell.test.tsx`

Expected: FAIL because the alert link is absent.

- [ ] **Step 3: AppShell을 구현한다**

```tsx
<div className="mobile-app-shell">
  <div className="device-notch" aria-hidden="true" />
  <header className="mobile-app-header">...</header>
  <main className="app-content">{children}</main>
  <nav className="bottom-tabs" aria-label="하단 탐색">
    ...
  </nav>
</div>
```

헤더 오른쪽을 `/notifications` 링크로 만들고 하단 탭을 `솔루션`, `매출`, `저장됨`, `프로필`로 구성한다.

- [ ] **Step 4: 프레임 CSS를 구현한다**

```css
@media (min-width: 431px) {
  .mobile-app-shell {
    height: min(844px, calc(100dvh - 48px));
    overflow: hidden;
  }
  .app-content {
    height: 100%;
    overflow-y: auto;
  }
  .mobile-app-header,
  .bottom-tabs {
    position: absolute;
    inset-inline: 0;
  }
}
```

모바일 미디어 쿼리에서는 프레임 테두리·노치·그림자를 제거하고 `app-content`가 뷰포트를 사용하게 한다.

- [ ] **Step 5: 단위 테스트를 통과시킨다**

Run: `npm run test -- --run src/shared/ui/AppShell.test.tsx`

Expected: PASS.

### Task 2: 목업 도메인 fixture와 재사용 상태 UI 추가

**Files:**

- Create: `src/entities/dashboard/model/fixtures.ts`
- Create: `src/shared/ui/EmptyState.tsx`
- Create: `src/shared/ui/SectionCard.tsx`
- Create: `src/shared/ui/EmptyState.test.tsx`
- Modify: `src/index.css`

**Interfaces:**

- Produces: `dashboardFixtures`, `EmptyState({ title, description, action })`, `SectionCard({ eyebrow, title, children })`

- [ ] **Step 1: 실패하는 EmptyState 테스트를 작성한다**

```tsx
render(
  <EmptyState
    title="새 알림이 없습니다"
    description="새로운 소식이 도착하면 알려드릴게요."
  />,
)
expect(
  screen.getByRole('heading', { name: '새 알림이 없습니다' }),
).toBeInTheDocument()
```

- [ ] **Step 2: 테스트가 실패함을 확인한다**

Run: `npm run test -- --run src/shared/ui/EmptyState.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: 타입과 fixture를 작성한다**

```ts
export type NotificationFixture = { id: string; title: string; detail: string; createdAt: string; read: boolean }
export const dashboardFixtures = { profile: {...}, notifications: [...], savedSolutions: [...], sales: {...} }
```

fixture에는 매장명, 계정 이메일, 알림 목록, 저장 솔루션, 최근 매출 요약 및 일별 매출을 넣는다.

- [ ] **Step 4: 재사용 UI와 스타일을 구현한다**

빈 상태에는 제목·설명·선택적 행동 링크를, 카드에는 eyebrow·제목·본문 영역을 구현한다. 카드, 버튼, 포커스 상태, 상태 배지를 공통 스타일로 작성한다.

- [ ] **Step 5: 단위 테스트를 통과시킨다**

Run: `npm run test -- --run src/shared/ui/EmptyState.test.tsx`

Expected: PASS.

### Task 3: 로그인·알림·프로필 목업 화면 및 라우팅 추가

**Files:**

- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/NotificationsPage.tsx`
- Create: `src/pages/ProfilePage.tsx`
- Create: `src/pages/NotificationsPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/index.css`

**Interfaces:**

- Consumes: `dashboardFixtures`, `AppShell`, `EmptyState`, `SectionCard`
- Produces: `/login`, `/notifications`, `/profile` 라우트

- [ ] **Step 1: 알림 화면의 실패하는 테스트를 작성한다**

```tsx
render(
  <MemoryRouter>
    <NotificationsPage />
  </MemoryRouter>,
)
expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument()
expect(screen.getByText('오늘의 솔루션이 도착했어요')).toBeInTheDocument()
```

- [ ] **Step 2: 테스트가 실패함을 확인한다**

Run: `npm run test -- --run src/pages/NotificationsPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: 화면과 라우트를 구현한다**

로그인은 이메일·비밀번호 입력과 “로그인 API 연결 예정” 안내만 제공한다. 알림은 읽음·읽지 않음 시각 상태와 빈 상태를 표시한다. 프로필은 매장명, 이메일, 메뉴 목록을 fixture로 표시한다. 모두 `AppShell`로 감싼다.

- [ ] **Step 4: 단위 테스트를 통과시킨다**

Run: `npm run test -- --run src/pages/NotificationsPage.test.tsx`

Expected: PASS.

### Task 4: 매출 업로드·분석 목업 화면 및 라우팅 추가

**Files:**

- Create: `src/pages/SalesUploadPage.tsx`
- Create: `src/pages/SalesAnalysisPage.tsx`
- Create: `src/pages/SalesUploadPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/index.css`

**Interfaces:**

- Consumes: `dashboardFixtures.sales`, `AppShell`, `SectionCard`
- Produces: `/sales/upload`, `/sales/analysis` 라우트와 로컬 파일 선택 상태

- [ ] **Step 1: 파일 확장자 검증의 실패하는 테스트를 작성한다**

```tsx
render(
  <MemoryRouter>
    <SalesUploadPage />
  </MemoryRouter>,
)
fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
  target: {
    files: [new File(['x'], 'sales.pdf', { type: 'application/pdf' })],
  },
})
expect(screen.getByRole('alert')).toHaveTextContent(
  'CSV 또는 엑셀 파일만 업로드할 수 있습니다.',
)
```

- [ ] **Step 2: 테스트가 실패함을 확인한다**

Run: `npm run test -- --run src/pages/SalesUploadPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: 업로드 화면을 구현한다**

`accept=".csv,.xlsx,.xls"` 파일 입력을 제공한다. 파일 선택은 로컬 이름만 표시하고 서버에 전송하지 않는다. 유효 확장자는 “분석 화면 미리 보기” 링크를, 비정상 확장자는 alert를 표시한다.

- [ ] **Step 4: 분석 화면을 구현한다**

fixture의 총매출, 전주 대비 변화, 주문 수, 객단가 및 7일 막대 차트를 카드로 표시한다. 데이터 없음 fixture에도 업로드 화면으로 향하는 행동을 제공한다.

- [ ] **Step 5: 단위 테스트를 통과시킨다**

Run: `npm run test -- --run src/pages/SalesUploadPage.test.tsx`

Expected: PASS.

### Task 5: 기존 솔루션·회원가입 화면의 모바일 적합성 정리

**Files:**

- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/SolutionPage.tsx`
- Modify: `src/pages/MySolutionsPage.tsx`
- Modify: `src/pages/SignupPage.tsx`
- Modify: `src/pages/SignupPage.test.tsx`
- Modify: `src/index.css`

**Interfaces:**

- Consumes: 기존 회원가입 API 모듈 및 새 `EmptyState`
- Produces: 프레임 크기에 맞는 회원가입·솔루션·저장 화면

- [ ] **Step 1: 회원가입 API 회귀 테스트를 실행한다**

Run: `npm run test -- --run src/pages/SignupPage.test.tsx src/features/signup/api/signupApi.test.ts`

Expected: PASS before CSS-only 레이아웃 변경.

- [ ] **Step 2: 회원가입 레이아웃을 프레임에 맞춘다**

회원가입에만 `AppShell`을 적용하지 않는다. 기존 단계·폼·API 핸들러는 보존한 채, 데스크톱 기기 프레임 규칙과 동일한 폭·높이·내부 스크롤·폼 여백을 `signup-page`에 적용한다.

- [ ] **Step 3: 기존 화면을 fixture 기반 빈 상태와 연결한다**

`MySolutionsPage`는 fixture 목록이 있으면 저장 카드를, 없으면 `EmptyState`를 표시한다. 랜딩 버튼은 `/login`, `/signup`, `/solution`으로 정확히 이동한다. 솔루션 없음 상태는 분석 업로드로 연결한다.

- [ ] **Step 4: 회원가입 회귀 테스트를 통과시킨다**

Run: `npm run test -- --run src/pages/SignupPage.test.tsx src/features/signup/api/signupApi.test.ts`

Expected: PASS with unchanged requests and field errors.

### Task 6: 전체 검증과 수동 UI 확인

**Files:**

- Modify: 필요 시 위 작업에서 만든 파일만 수정

- [ ] **Step 1: 전체 테스트를 실행한다**

Run: `npm run test -- --run`

Expected: PASS.

- [ ] **Step 2: 린트를 실행한다**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: 프로덕션 빌드를 실행한다**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: 5173에서 수동 확인한다**

확인 경로: `/`, `/login`, `/signup`, `/solution`, `/my-solutions`, `/notifications`, `/profile`, `/sales/upload`, `/sales/analysis`. PC에서는 기기 프레임 내부만 스크롤되는지, 모바일 폭에서는 전체 화면 앱이 되는지 확인한다.
