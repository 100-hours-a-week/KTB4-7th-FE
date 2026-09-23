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

http.interceptors.request.use((config) => {
  if (
    !config.method ||
    !stateChangingMethods.has(config.method.toLowerCase())
  ) {
    return config
  }

  const csrfToken = getCookieValue(csrfCookieName)
  if (csrfToken) config.headers[csrfHeaderName] = decodeURIComponent(csrfToken)

  return config
})

export function initializeCsrfToken() {
  return http.get('/v1/auth/csrf-token')
}
