import axios from 'axios'
import { getApiBaseUrl } from '../config/env'

export const http = axios.create({
  baseURL: getApiBaseUrl(import.meta.env),
  withCredentials: true,
})

const csrfCookieName = 'XSRF-TOKEN'
const csrfHeaderName = 'X-XSRF-TOKEN'
const stateChangingMethods = new Set(['post', 'put', 'patch', 'delete'])

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return undefined

  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

let csrfTokenRequest: Promise<unknown> | null = null

http.interceptors.request.use(async (config) => {
  if (
    !config.method ||
    !stateChangingMethods.has(config.method.toLowerCase())
  ) {
    return config
  }

  // CSRF 쿠키가 아직 발급되지 않았다면(앱 시작 시 호출한 GET이 아직
  // 응답하지 않은 경우 등) 진행 중인 발급 요청이 끝날 때까지 기다린 뒤
  // 헤더를 채운다. 이 대기 로직이 없으면 상태 변경 요청이 CSRF 쿠키
  // 발급보다 먼저 도착해 X-XSRF-TOKEN 헤더 없이 나가는 레이스 컨디션이
  // 발생할 수 있다.
  if (!getCookieValue(csrfCookieName) && csrfTokenRequest) {
    await csrfTokenRequest.catch(() => undefined)
  }

  const csrfToken = getCookieValue(csrfCookieName)
  if (csrfToken) config.headers[csrfHeaderName] = decodeURIComponent(csrfToken)

  return config
})

export function initializeCsrfToken() {
  csrfTokenRequest = http.get('/v1/auth/csrf-token')
  return csrfTokenRequest
}
