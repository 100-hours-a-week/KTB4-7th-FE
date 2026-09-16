# 프론트엔드 초기 환경 설정 설계

## 목적

빈 프론트엔드 저장소를 React 기반의 팀 개발 환경으로 초기화한다. 프론트엔드는 LLM을 활용해 개발하므로, 기술 선택·폴더 경계·검증·GitHub 협업 규칙을 문서와 자동화로 명확히 고정한다.

## 최초 저장소 초기화

저장소에 기존 `dev` 브랜치가 없으므로 최초 초기화만 예외로 한다.

1. 최초 프로젝트 골격을 `dev` 브랜치에 커밋한다.
2. 이후 모든 개발은 최신 `dev`에서 `feat/이슈번호-기능명` 브랜치를 만들어 진행한다.
3. 기능 브랜치는 `dev`로만 PR을 생성하며 `main`에는 직접 PR을 만들지 않는다.

초기 환경 설정 작업은 GitHub Issue `#1`로 추적한다.

## 기술 구성

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- TanStack Query + Axios
- Zustand
- React Hook Form + Zod
- Vitest + Testing Library + MSW
- ESLint + Prettier
- Husky + lint-staged

API 주소 등 공개 가능한 설정은 `VITE_*` 환경변수로 관리한다. 실제 비밀값은 추적하지 않고 `.env.example`에는 변수 이름과 안전한 예시만 둔다.

## 코드 구조

```text
src/
  app/        # 라우팅, Provider, 앱 진입 구성
  pages/      # 페이지 조합
  features/   # 사용자 흐름별 기능
  entities/   # 도메인 모델과 도메인 단위 UI
  shared/     # 재사용 UI, API 클라이언트, 유틸리티, 설정
```

도메인 기능은 `features`에 둔다. 여러 기능에서 재사용되는 요소만 `shared`에 둔다. 백엔드 API의 URL·요청·응답·인증 방식은 공식 API 명세를 우선하며, 명세가 없거나 충돌하면 추측하지 않고 확인한다.

## 품질과 CI

- 개발자는 변경 후 `lint`, `test`, `build`를 실행한다.
- 커밋 시 lint-staged가 변경 파일의 린트와 포맷을 검사한다.
- `feat/*`에서 `dev`로 향하는 PR은 GitHub Actions가 린트·테스트·프로덕션 빌드를 실행한다.
- CI 실패를 우회하거나 검증을 제거하지 않는다.
- 운영 배포는 호스팅 방식이 정해진 뒤 별도 Issue와 워크플로로 추가한다.

## 협업 문서

- `AGENTS.md`: 한글로 작성하며 공식 문서 우선, API 계약, 보안, 테스트, Issue·브랜치·커밋·PR·CI 규칙을 다룬다.
- `.agents/skills/memme-frontend-development/SKILL.md`: 기능 개발과 PR 생성 시 적용할 절차를 한글로 작성한다.
- `.github/pull_request_template.md`: 한글 PR 제목, 변경 사항, 테스트 결과, API 변경 여부, `Closes #이슈번호`를 포함한다.

## 검증 기준

초기 설정 완료 전 아래를 확인한다.

1. 의존성 설치가 성공한다.
2. 린트가 통과한다.
3. 테스트가 통과한다.
4. 프로덕션 빌드가 통과한다.
5. GitHub Actions 워크플로가 `feat/* → dev` PR 조건으로 정의되어 있다.
