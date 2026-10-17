export type ApiEnvironment = {
  VITE_API_BASE_URL?: string
}

export function getApiBaseUrl(
  env: ApiEnvironment,
  pageHostname = typeof window === 'undefined' ? '' : window.location.hostname,
): string {
  const baseUrl = env.VITE_API_BASE_URL ?? ''
  const loopbackHosts = new Set(['localhost', '127.0.0.1'])
  if (!loopbackHosts.has(pageHostname) || !baseUrl) return baseUrl

  try {
    const url = new URL(baseUrl)
    if (!loopbackHosts.has(url.hostname)) return baseUrl
    url.hostname = pageHostname
    return url.toString().replace(/\/$/, '')
  } catch {
    return baseUrl
  }
}
