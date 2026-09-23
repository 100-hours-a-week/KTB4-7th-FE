import type { AxiosRequestConfig } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'
import { getApiBaseUrl } from '../config/env'
import { http, initializeCsrfToken } from './http'

const originalAdapter = http.defaults.adapter

afterEach(() => {
  http.defaults.adapter = originalAdapter
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
  vi.restoreAllMocks()
})

test('API 기본 주소를 환경변수에서 읽는다', () => {
  expect(getApiBaseUrl({ VITE_API_BASE_URL: 'https://api.example.com' })).toBe(
    'https://api.example.com',
  )
})

test('앱 시작 시 CSRF 토큰 발급 API를 호출한다', async () => {
  const get = vi.spyOn(http, 'get').mockResolvedValue({} as never)

  await initializeCsrfToken()

  expect(get).toHaveBeenCalledWith('/v1/auth/csrf-token')
})

test('상태 변경 요청에 XSRF 쿠키 값을 헤더로 보낸다', async () => {
  document.cookie = 'XSRF-TOKEN=csrf-cookie-value; Path=/'
  let request: AxiosRequestConfig | undefined
  http.defaults.adapter = async (config) => {
    request = config
    return {
      config,
      data: null,
      headers: {},
      status: 204,
      statusText: 'No Content',
    }
  }

  await http.post('/v1/example', {})

  expect(request?.headers?.['X-XSRF-TOKEN']).toBe('csrf-cookie-value')
})

test('GET 요청에는 XSRF 헤더를 추가하지 않는다', async () => {
  document.cookie = 'XSRF-TOKEN=csrf-cookie-value; Path=/'
  let request: AxiosRequestConfig | undefined
  http.defaults.adapter = async (config) => {
    request = config
    return {
      config,
      data: null,
      headers: {},
      status: 200,
      statusText: 'OK',
    }
  }

  await http.get('/v1/example')

  expect(request?.headers?.['X-XSRF-TOKEN']).toBeUndefined()
})
