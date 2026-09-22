# 회원가입 전체 연동 설계

## 목표

프론트엔드에서 계정 정보, 사업자 인증, 매장 정보 입력을 순서대로 진행해 기존 백엔드 회원가입 API를 호출하고 가입 완료 상태를 보여준다.

## 범위

- `/signup` 단일 라우트에서 3단계 회원가입 흐름을 제공한다.
- 1단계는 `POST /v1/auth/signup/account`에 이메일, 비밀번호, 비밀번호 확인, 휴대폰 번호, 필수 약관 동의를 전송한다.
- 2단계에서 `POST /v1/auth/business-verifications`로 사업자등록번호를 인증한 뒤, 매장 정보와 `Signup-Token` 헤더를 사용해 `POST /v1/auth/signup/business`를 호출한다.
- 완료 단계에서는 로그인 화면으로 이동할 수 있는 안내만 제공한다.

로그인, 액세스 토큰·세션 발급, 주소 검색 API, 사업자 인증 API 이외의 외부 연동은 포함하지 않는다.

## API 계약

모든 API의 기본 주소는 `VITE_API_BASE_URL`을 사용한다. 응답은 `{ message, data }` 구조다.

| 단계        | 요청                                                 | 성공 응답                                              | 오류 처리                                               |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| 계정 정보   | `POST /v1/auth/signup/account`                       | `201`, `data.signupToken`, `data.expiresAt`            | `409`, `422`의 필드 오류를 해당 입력 아래에 표시        |
| 사업자 인증 | `POST /v1/auth/business-verifications`               | `200`, `data.businessVerificationId`, `data.expiresAt` | `422` 입력 오류, `502` 인증 실패 메시지 표시            |
| 가입 완료   | `POST /v1/auth/signup/business`, `Signup-Token` 헤더 | `201`, 사용자·매장 정보                                | `409`, `422` 필드 오류, `410` 가입 처음부터 재시작 안내 |

약관 버전은 사용자 승인에 따라 `termsOfServiceVersion`, `privacyPolicyVersion` 모두 `2026-09`로 전송한다.

## 화면과 상태

`SignupPage`는 현재 단계, 계정 API가 발급한 가입 토큰, 사업자 인증 ID를 브라우저 탭 단위 상태로만 보관한다. 새로고침하면 민감한 가입 토큰을 복구하지 않고 1단계부터 다시 시작한다.

- 1단계: React Hook Form/Zod로 백엔드와 같은 형식 검증을 수행한다. 성공하면 2단계로 이동한다.
- 2단계: 사업자등록번호 인증이 성공하기 전에는 가입 완료 제출을 막는다. 매장명, 주소, 상세 주소, 월~일 영업시간을 입력하며 휴무일은 시간을 비운다.
- 3단계: API가 반환한 매장명을 표시한다.

## 구조

`features/signup/api`는 Axios 요청과 API 타입을 담당한다. `features/signup/model`은 폼 검증 스키마와 단계 상태를, `features/signup/ui`는 각 단계의 폼을 담당한다. `pages/SignupPage`는 페이지 조합과 단계 전환만 담당한다.

## 품질 기준

- 계정 API 요청, 사업자 인증 요청, 가입 완료 요청은 MSW 기반 테스트로 검증한다.
- 필수 입력 누락과 서버 필드 오류, 가입 토큰 만료를 화면에서 확인할 수 있어야 한다.
- PR 전 `npm run lint`, `npm run test -- --run`, `npm run build`를 실행한다.
