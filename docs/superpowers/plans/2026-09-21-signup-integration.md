# 회원가입 전체 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 백엔드 회원가입 API를 사용하는 3단계 React 회원가입 흐름을 구현한다.

**Architecture:** `features/signup`에 API 계약, 폼 검증, UI를 모으고 `SignupPage`는 단계 조합만 맡는다. 가입 토큰과 사업자 인증 ID는 페이지 메모리에만 유지하며, Axios 요청은 기존 `shared/api/http.ts`를 사용한다.

**Tech Stack:** React, TypeScript, React Router, React Hook Form, Zod, Axios, Vitest, Testing Library, MSW

**Spec:** `docs/superpowers/specs/2026-09-21-signup-integration-design.md`

## Global Constraints

- API 기본 주소는 `VITE_API_BASE_URL`만 사용한다.
- API URL, 헤더, 요청·응답 필드는 백엔드 구현과 일치시킨다.
- 약관 버전은 `2026-09`로 전송한다.
- 로그인과 세션 발급은 구현하지 않는다.
- 실제 비밀값·가입 토큰을 저장소 또는 `localStorage`에 저장하지 않는다.

## Review Focus

- 계정 API의 409/422 필드 오류가 이메일·비밀번호·휴대폰 입력에 정확히 표시되는지 검증한다.
- 사업자 인증 성공 전 완료 API가 호출되지 않는지 검증한다.
- `Signup-Token` 헤더가 가입 완료 요청에만 포함되는지 검증한다.
- 410 만료 응답에서 1단계로 돌아가고 토큰을 폐기하는지 검증한다.
- 휴무일의 영업시간이 빈 문자열로 전송되는지 검증한다.

---

### Task 1: 회원가입 API 계약과 오류 변환

**Files:**

- Create: `src/features/signup/api/signupApi.ts`
- Create: `src/features/signup/api/signupApi.test.ts`

**Interfaces:**

- Produces: `requestSignupAccount`, `verifyBusinessNumber`, `completeSignup`
- Consumes: 기존 `http` Axios 인스턴스

- [ ] **Step 1: 실패 테스트를 작성한다.**

```ts
test('가입 완료 요청에 가입 토큰 헤더를 전달한다', async () => {
  await completeSignup('temporary-token', validBusinessRequest)
  expect(capturedHeaders['Signup-Token']).toBe('temporary-token')
})
```

- [ ] **Step 2: 테스트가 아직 실패하는지 확인한다.**

Run: `npm test -- --run src/features/signup/api/signupApi.test.ts`

Expected: `completeSignup` 모듈이 없어 실패한다.

- [ ] **Step 3: 최소 API 모듈을 구현한다.**

```ts
export async function completeSignup(
  token: string,
  request: SignupBusinessRequest,
) {
  const response = await http.post<ApiResponse<SignupBusinessResponse>>(
    '/v1/auth/signup/business',
    request,
    { headers: { 'Signup-Token': token } },
  )
  return response.data.data
}
```

계정, 사업자 인증, 가입 완료 요청 타입과 서버의 `fieldErrors.errors`를 읽는 오류 변환 함수를 함께 구현한다.

- [ ] **Step 4: 테스트가 통과하는지 확인한다.**

Run: `npm test -- --run src/features/signup/api/signupApi.test.ts`

Expected: API 계약 테스트가 통과한다.

### Task 2: 계정 정보 폼과 1단계 전환

**Files:**

- Create: `src/features/signup/model/accountSchema.ts`
- Create: `src/features/signup/ui/AccountSignupForm.tsx`
- Create: `src/features/signup/ui/AccountSignupForm.test.tsx`

**Interfaces:**

- Consumes: `requestSignupAccount(request)`
- Produces: `onComplete({ signupToken, expiresAt })`

- [ ] **Step 1: 실패 테스트를 작성한다.**

```tsx
test('유효한 계정 정보를 제출하면 가입 토큰을 다음 단계로 전달한다', async () => {
  render(<AccountSignupForm onComplete={onComplete} />)
  await fillValidAccountForm()
  await user.click(screen.getByRole('button', { name: '다음' }))
  expect(onComplete).toHaveBeenCalledWith(
    expect.objectContaining({ signupToken: 'token' }),
  )
})
```

- [ ] **Step 2: 테스트가 아직 실패하는지 확인한다.**

Run: `npm test -- --run src/features/signup/ui/AccountSignupForm.test.tsx`

Expected: `AccountSignupForm` 모듈이 없어 실패한다.

- [ ] **Step 3: 폼과 백엔드 일치 Zod 검증을 구현한다.**

이메일, 8~20자의 대문자·소문자·숫자·특수문자 포함 비밀번호, 비밀번호 확인 일치, `010` 시작 11자리 휴대폰, 필수 약관 동의를 검증하고, 약관 버전 `2026-09`를 API 요청에 포함한다.

- [ ] **Step 4: 필수 오류 시나리오를 추가한다.**

```tsx
test('서버 필드 오류를 이메일 입력 아래에 표시한다', async () => {
  server.use(
    accountSignupReturnsFieldError('email', '이미 사용 중인 이메일입니다.'),
  )
  render(<AccountSignupForm onComplete={vi.fn()} />)
  await fillValidAccountForm()
  await user.click(screen.getByRole('button', { name: '다음' }))
  expect(
    await screen.findByText('이미 사용 중인 이메일입니다.'),
  ).toBeInTheDocument()
})
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다.**

Run: `npm test -- --run src/features/signup/ui/AccountSignupForm.test.tsx`

Expected: 정상 전환과 서버 오류 표시 테스트가 통과한다.

### Task 3: 사업자 인증·매장 정보 폼과 가입 완료

**Files:**

- Create: `src/features/signup/model/businessSchema.ts`
- Create: `src/features/signup/ui/BusinessSignupForm.tsx`
- Create: `src/features/signup/ui/BusinessSignupForm.test.tsx`

**Interfaces:**

- Consumes: `signupToken`, `verifyBusinessNumber`, `completeSignup`
- Produces: `onComplete({ storeName })`, `onExpired()`

- [ ] **Step 1: 실패 테스트를 작성한다.**

```tsx
test('사업자 인증 전에는 가입 완료를 제출할 수 없다', async () => {
  render(
    <BusinessSignupForm
      signupToken="token"
      onComplete={vi.fn()}
      onExpired={vi.fn()}
    />,
  )
  await fillValidBusinessForm()
  await user.click(screen.getByRole('button', { name: '가입 완료' }))
  expect(
    await screen.findByText('사업자 인증을 먼저 완료해 주세요.'),
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트가 아직 실패하는지 확인한다.**

Run: `npm test -- --run src/features/signup/ui/BusinessSignupForm.test.tsx`

Expected: `BusinessSignupForm` 모듈이 없어 실패한다.

- [ ] **Step 3: 사업자 인증과 7일 영업시간 입력을 구현한다.**

사업자등록번호 인증 성공 시 `businessVerificationId`를 메모리에 저장한다. 월요일부터 일요일까지 요일·휴무·시작·종료를 모두 API 형식으로 만든다. 휴무일은 시작과 종료를 빈 문자열로 전송한다.

- [ ] **Step 4: 만료 오류 테스트를 추가한다.**

```tsx
test('가입 토큰 만료 시 처음 단계로 되돌린다', async () => {
  server.use(completeSignupReturnsGone())
  render(
    <BusinessSignupForm
      signupToken="expired"
      onComplete={vi.fn()}
      onExpired={onExpired}
    />,
  )
  await verifyBusinessAndFillForm()
  await user.click(screen.getByRole('button', { name: '가입 완료' }))
  expect(onExpired).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다.**

Run: `npm test -- --run src/features/signup/ui/BusinessSignupForm.test.tsx`

Expected: 인증 전 차단, 완료 요청, 410 만료 처리 테스트가 통과한다.

### Task 4: 페이지·라우터·완료 상태 조합

**Files:**

- Create: `src/pages/SignupPage.tsx`
- Create: `src/pages/SignupPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**

- Consumes: `AccountSignupForm`, `BusinessSignupForm`
- Produces: `/signup` 회원가입 화면

- [ ] **Step 1: 실패 테스트를 작성한다.**

```tsx
test('회원가입 경로에서 계정 정보 단계 제목을 표시한다', async () => {
  render(<App />)
  window.history.pushState({}, '', '/signup')
  expect(
    await screen.findByRole('heading', { name: '회원가입' }),
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트가 아직 실패하는지 확인한다.**

Run: `npm test -- --run src/pages/SignupPage.test.tsx`

Expected: `/signup` 라우트가 없어 실패한다.

- [ ] **Step 3: 페이지 조합과 완료 상태를 구현한다.**

`SignupPage`는 토큰을 페이지 메모리에만 보관하고, 410 응답 시 1단계로 초기화한다. 완료 단계는 가입 매장명과 로그인 이동 링크를 표시한다. 홈 화면에는 `/signup` 이동 링크를 제공한다.

- [ ] **Step 4: 테스트가 통과하는지 확인한다.**

Run: `npm test -- --run src/pages/SignupPage.test.tsx`

Expected: 회원가입 라우트와 완료 화면 전환 테스트가 통과한다.

### Task 5: 품질 검증

**Files:**

- Modify: 변경된 회원가입 파일 전체

- [ ] **Step 1: 포맷을 적용한다.**

Run: `npm run format`

- [ ] **Step 2: 린트를 실행한다.**

Run: `npm run lint`

Expected: 종료 코드 0.

- [ ] **Step 3: 전체 테스트를 실행한다.**

Run: `npm test -- --run`

Expected: 모든 테스트 통과.

- [ ] **Step 4: 프로덕션 빌드를 실행한다.**

Run: `npm run build`

Expected: 종료 코드 0.
