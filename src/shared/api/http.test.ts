import { getApiBaseUrl } from '../config/env'

test('API 기본 주소를 환경변수에서 읽는다', () => {
  expect(getApiBaseUrl({ VITE_API_BASE_URL: 'https://api.example.com' })).toBe(
    'https://api.example.com',
  )
})
