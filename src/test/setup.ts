import '@testing-library/jest-dom/vitest'

// jsdom(테스트 환경)에는 scrollIntoView가 구현되어 있지 않아
// 이를 호출하는 컴포넌트의 테스트가 TypeError로 실패한다. 실제
// 브라우저에서는 정상 동작하므로 테스트 환경에만 no-op 폴리필을 채운다.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {}
}
